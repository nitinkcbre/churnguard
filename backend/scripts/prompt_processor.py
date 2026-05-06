import asyncio
import json
from collections import Counter
from datetime import UTC, datetime

from pymongo import MongoClient

from llm_client import call_llm
from llm_client import client as llm_foundry_client
from llm_client import deployment_name
from prompts import (
	ACTION_SYSTEM,
	ACTION_USER,
	DECISION_SYSTEM,
	DECISION_USER,
	EXEC_SYSTEM,
	EXEC_USER,
	RISK_SYSTEM,
	RISK_USER,
	SENTIMENT_SYSTEM,
	SENTIMENT_USER,
	TREND_SYSTEM,
	TREND_USER,
)


client = MongoClient("mongodb://localhost:27017/")
db = client["churnguard"]

tenants_col = db.tenant_meta_data
emails_col = db.emails
tickets_col = db.helpdesk_tickets
surveys_col = db.surveys
processor_results_col = db.ai_prompt_processor_results
health_history_col = db.tenant_health_score_history


TEXT_FIELDS = [
	"email_body",
	"ticket_body",
	"survey_response",
	"comments",
	"message",
	"body",
	"text",
	"description",
	"comment",
]


def _extract_message_text(doc: dict) -> str | None:
	for field in TEXT_FIELDS:
		value = doc.get(field)
		if isinstance(value, str) and value.strip():
			return value.strip()

	if doc.get("source") == "helpdesk":
		parts = []
		open_tickets = doc.get("open_tickets")
		if isinstance(open_tickets, int):
			parts.append(f"Open tickets: {open_tickets}")

		tickets_last_60_days = doc.get("tickets_last_60_days")
		if isinstance(tickets_last_60_days, int):
			parts.append(f"Tickets in last 60 days: {tickets_last_60_days}")

		sla_breaches = doc.get("sla_breaches")
		if isinstance(sla_breaches, int):
			parts.append(f"SLA breaches: {sla_breaches}")

		reopen_rate = doc.get("reopen_rate")
		if isinstance(reopen_rate, (int, float)):
			parts.append(f"Reopen rate: {reopen_rate}")

		dominant_issues = doc.get("dominant_issues")
		if isinstance(dominant_issues, str) and dominant_issues.strip():
			parts.append(f"Dominant issues: {dominant_issues.strip()}")

		if parts:
			return "; ".join(parts)

	return None


def _get_doc_tenant_id(doc: dict) -> str | None:
	tenant_id = doc.get("tenant_id") or doc.get("tenantId")
	return tenant_id if isinstance(tenant_id, str) and tenant_id.strip() else None


def _get_doc_created_at(doc: dict):
	return (
		doc.get("created_at")
		or doc.get("createdAt")
		or doc.get("submitted_at")
		or doc.get("email_date")
	)


def _normalize_datetime(dt) -> datetime:
	"""Convert datetime to UTC-aware, or return UTC min if None/invalid."""
	if dt is None:
		return datetime.min.replace(tzinfo=UTC)
	if not isinstance(dt, datetime):
		return datetime.min.replace(tzinfo=UTC)
	if dt.tzinfo is None:
		return dt.replace(tzinfo=UTC)
	return dt


async def _db_find(collection, query: dict, projection: dict) -> list[dict]:
	return await asyncio.to_thread(lambda: list(collection.find(query, projection)))


async def _db_replace_one(collection, query: dict, document: dict, upsert: bool = True):
	return await asyncio.to_thread(collection.replace_one, query, document, upsert)


async def _db_update_one(collection, query: dict, update: dict, upsert: bool = True):
	return await asyncio.to_thread(collection.update_one, query, update, upsert=upsert)


async def _run_prompt(system_prompt: str, user_prompt: str) -> dict:
	return await asyncio.to_thread(call_llm, system_prompt, user_prompt)


async def _run_prompt_text(system_prompt: str, user_prompt: str) -> str:
	def _call_text() -> str:
		response = llm_foundry_client.messages.create(
			model=deployment_name,
			system=system_prompt,
			messages=[{"role": "user", "content": user_prompt}],
			max_tokens=1024,
		)
		return "".join(
			block.text for block in response.content if hasattr(block, "text")
		).strip()

	return await asyncio.to_thread(_call_text)


async def _collect_tenant_messages(tenant_id: str) -> list[dict]:
	tenant_filter = {"$or": [{"tenant_id": tenant_id}, {"tenantId": tenant_id}]}
	projection = {
		"_id": 1,
		"tenant_id": 1,
		"tenantId": 1,
		"created_at": 1,
		"createdAt": 1,
		"submitted_at": 1,
		"email_date": 1,
		"email_body": 1,
		"ticket_body": 1,
		"survey_response": 1,
		"comments": 1,
		"message": 1,
		"body": 1,
		"text": 1,
		"description": 1,
		"comment": 1,
		"response_delay_hours": 1,
		"source": 1,
		"open_tickets": 1,
		"tickets_last_60_days": 1,
		"sla_breaches": 1,
		"reopen_rate": 1,
		"dominant_issues": 1,
	}

	email_docs_task = _db_find(emails_col, tenant_filter, projection)
	ticket_docs_task = _db_find(tickets_col, tenant_filter, projection)
	survey_docs_task = _db_find(surveys_col, tenant_filter, projection)

	email_docs, ticket_docs, survey_docs = await asyncio.gather(
		email_docs_task,
		ticket_docs_task,
		survey_docs_task,
	)

	normalized = []
	for source_name, docs in [
		("email", email_docs),
		("helpdesk", ticket_docs),
		("survey", survey_docs),
	]:
		#print(f"Collected {len(docs)} documents from {source_name} for tenant {tenant_id}")
		for doc in docs:
			text = _extract_message_text(doc)
			if not text:
				#print(f"Skipping {source_name} document {doc.get('_id')} with no extractable text")
				continue
			normalized.append(
				{
					"source": source_name,
					"source_doc_id": str(doc.get("_id")),
					"tenant_id": _get_doc_tenant_id(doc) or tenant_id,
					"created_at": _get_doc_created_at(doc),
					"response_delay_hours": doc.get("response_delay_hours"),
					"text": text,
				}
			)

	normalized.sort(key=lambda x: _normalize_datetime(x.get("created_at")))
	return normalized


async def _run_prompt1_for_messages(messages: list[dict]) -> list[dict]:
	tasks = []
	for msg in messages:
		user_prompt = SENTIMENT_USER.replace("{TEXT}", msg["text"])
		tasks.append(_run_prompt(SENTIMENT_SYSTEM, user_prompt))

	prompt1_raw_outputs = await asyncio.gather(*tasks) if tasks else []

	prompt1_outputs = []
	for msg, llm_output in zip(messages, prompt1_raw_outputs):
		prompt1_outputs.append(
			{
				"source": msg["source"],
				"source_doc_id": msg["source_doc_id"],
				"tenant_id": msg["tenant_id"],
				"created_at": msg["created_at"],
				"response_delay_hours": msg.get("response_delay_hours"),
				"text": msg["text"],
				"sentiment_score": llm_output.get("sentiment_score"),
				"sentiment_label": llm_output.get("sentiment_label"),
				"frustration_signal": bool(llm_output.get("frustration_signal", False)),
				"issue_category": llm_output.get("issue_category", "None"),
				"raw_prompt1_output": llm_output,
			}
		)

	return prompt1_outputs


def _build_scores_for_trend(prompt1_outputs: list[dict]) -> str:
	scores = []
	for item in prompt1_outputs:
		score = item.get("sentiment_score")
		if isinstance(score, (int, float)):
			scores.append(
				{
					"date": str(item.get("created_at")),
					"score": score,
				}
			)
	return json.dumps(scores)


def _compute_primary_issue(prompt1_outputs: list[dict]) -> str:
	issues = [
		item.get("issue_category")
		for item in prompt1_outputs
		if item.get("issue_category") and item.get("issue_category") != "None"
	]
	if not issues:
		return "None"
	return Counter(issues).most_common(1)[0][0]


def _compute_repeated_issues(prompt1_outputs: list[dict]) -> int:
	return sum(1 for item in prompt1_outputs if item.get("frustration_signal"))


def _compute_avg_response_delay(prompt1_outputs: list[dict]) -> float:
	vals = [
		item.get("response_delay_hours")
		for item in prompt1_outputs
		if isinstance(item.get("response_delay_hours"), (int, float))
	]
	if not vals:
		return 0.0
	return round(sum(vals) / len(vals), 2)


async def process_tenant(tenant_doc: dict, run_started_at: datetime) -> dict:
	tenant_id = tenant_doc.get("tenantId") or tenant_doc.get("tenant_id")
	if not tenant_id:
		raise ValueError("Tenant document missing tenantId")

	tenant_name = tenant_doc.get("name", tenant_id)
	tier = tenant_doc.get("tier", "Unknown")
	lease_value = tenant_doc.get("lease_value", 0)
	days_to_renewal = tenant_doc.get("days_to_renewal", 0)

	tenant_messages = await _collect_tenant_messages(tenant_id)

	# Prompt 1 output variable: per-message sentiment extraction results.
	prompt1_output = await _run_prompt1_for_messages(tenant_messages)

	scores_json = _build_scores_for_trend(prompt1_output)
	trend_user = TREND_USER.replace("{SCORES_JSON}", scores_json)

	# Prompt 2 output variable: trend analysis from Prompt 1 scores.
	prompt2_output = await _run_prompt(TREND_SYSTEM, trend_user)

	repeated_issues = _compute_repeated_issues(prompt1_output)
	primary_issue_category = _compute_primary_issue(prompt1_output)
	avg_response_hours = _compute_avg_response_delay(prompt1_output)

	risk_user = (
		RISK_USER.replace("{TENANT_NAME}", str(tenant_name))
		.replace("{TIER}", str(tier))
		.replace("{LEASE_VALUE}", str(lease_value))
		.replace("{DAYS_TO_RENEWAL}", str(days_to_renewal))
		.replace("{SENTIMENT_TREND}", str(prompt2_output.get("trend_direction", "Stable")))
		.replace("{TREND_STRENGTH}", str(prompt2_output.get("trend_strength", "Weak")))
		.replace("{NUMBER}", str(repeated_issues))
		.replace("{CATEGORY}", str(primary_issue_category))
		.replace("{HOURS}", str(avg_response_hours))
	)

	# Prompt 3 output variable: overall risk reasoning.
	prompt3_output = await _run_prompt(RISK_SYSTEM, risk_user)
	health_score_raw = prompt3_output.get("health_score", 0)
	health_score = int(round(health_score_raw)) if isinstance(health_score_raw, (int, float)) else 0
	health_score = max(0, min(100, health_score))

	decision_user = (
		DECISION_USER.replace("{Risk}", str(prompt3_output.get("risk_level", "Low")))
		.replace("{Tier}", str(tier))
		.replace("{Days}", str(days_to_renewal))
		.replace("{Health}", str(health_score))
	)

	# Prompt 4 output variable: alert decision and urgency.
	prompt4_output = await _run_prompt(DECISION_SYSTEM, decision_user)

	action_user = (
		ACTION_USER.replace("{High}", str(prompt3_output.get("risk_level", "Low")))
		.replace("{HVAC}", str(primary_issue_category))
		.replace("{Platinum}", str(tier))
		.replace("{Days}", str(days_to_renewal))
	)

	# Prompt 5 output variable: recommended action plan.
	prompt5_output = await _run_prompt(ACTION_SYSTEM, action_user)

	factors = {
		"risk_level": prompt3_output.get("risk_level"),
		"risk_drivers": prompt3_output.get("key_risk_drivers", []),
		"trend": prompt2_output,
		"decision": prompt4_output,
		"recommended_action": prompt5_output,
	}
	exec_user = EXEC_USER.replace("{FACTORS}", json.dumps(factors, indent=2))

	# Prompt 6 output variable: executive explanation text.
	prompt6_text = await _run_prompt_text(EXEC_SYSTEM, exec_user)
	prompt6_output = {"executive_summary": prompt6_text}
	now_utc = datetime.now(UTC)

	pipeline_output = {
		"_id": f"prompt_pipeline::{tenant_id}",
		"doc_type": "tenant_prompt_pipeline",
		"tenant_id": tenant_id,
		"tenant_context": {
			"name": tenant_name,
			"tier": tier,
			"lease_value": lease_value,
			"days_to_renewal": days_to_renewal,
			"health_score": health_score,
		},
		"source_message_count": len(tenant_messages),
		"prompt1_output": prompt1_output,
		"prompt2_output": prompt2_output,
		"prompt3_output": prompt3_output,
		"prompt4_output": prompt4_output,
		"prompt5_output": prompt5_output,
		"prompt6_output": prompt6_output,
		"created_at": now_utc,
	}

	await _db_replace_one(
		processor_results_col,
		{"_id": pipeline_output["_id"]},
		pipeline_output,
		upsert=True,
	)

	health_history_entry = {
		"date": run_started_at,
		"health_score": health_score,
		"risk_level": prompt3_output.get("risk_level", "Low"),
	}
	await _db_update_one(
		health_history_col,
		{"_id": f"tenant_health_history::{tenant_id}"},
		{
			"$setOnInsert": {
				"doc_type": "tenant_health_score_history",
				"tenant_id": tenant_id,
			},
			"$push": {"health_score_history": health_history_entry},
			"$inc": {"history_count": 1},
			"$set": {"updated_at": now_utc},
		},
		upsert=True,
	)

	return pipeline_output


async def run_prompt_processor() -> list[dict]:
	run_started_at = datetime.now(UTC)
	tenant_projection = {
		"_id": 0,
		"tenantId": 1,
		"name": 1,
		"tier": 1,
		"lease_value": 1,
		"days_to_renewal": 1,
	}
	tenants = await _db_find(tenants_col, {}, tenant_projection)

	outputs = []
	for tenant in tenants:
		output = await process_tenant(tenant, run_started_at)
		outputs.append(output)
	#print(f"Processed {len(outputs)} tenants in prompt pipeline run started at {run_started_at.isoformat()}")

	return outputs


if __name__ == "__main__":
	asyncio.run(run_prompt_processor())
