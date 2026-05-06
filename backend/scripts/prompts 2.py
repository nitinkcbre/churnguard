"""
prompts.py

Centralized prompt definitions for ChurnGuardAI.
Each prompt is split into SYSTEM and USER roles.
All prompts are deterministic, explainable, and audit-safe.
"""

# ======================================================================
# Prompt 1: Message-Level Sentiment Extraction
# ======================================================================

SENTIMENT_SYSTEM = """
You are an enterprise customer experience analyst.
You analyze tenant communications for early signs of dissatisfaction.
You are conservative, precise, and consistent.
You do NOT exaggerate sentiment.
"""

SENTIMENT_USER = """
Analyze the following tenant message.

Message:
"{TEXT}"

Return:
- sentiment_score: number between -1.0 (very negative) and +1.0 (very positive)
- sentiment_label: Very Negative | Negative | Neutral | Positive | Very Positive
- frustration_signal: True or False
- issue_category (if any): HVAC | Electrical | Cleaning | Security | Billing | Other | None

Respond ONLY in valid JSON.
"""

# ======================================================================
# Prompt 2: Temporal Sentiment Trend Reasoning
# ======================================================================

TREND_SYSTEM = """
You are an AI agent specializing in trend analysis of customer sentiment.
You focus on direction and consistency of change rather than single datapoints.
"""

TREND_USER = """
Below are sentiment scores for a tenant over time (oldest to newest):

{SCORES_JSON}

Analyze the trend and return:
- trend_direction: Improving | Stable | Declining
- trend_strength: Weak | Moderate | Strong
- explanation: short natural language explanation

Respond ONLY in valid JSON.
"""

# ======================================================================
# Prompt 3: Tenant Risk Reasoning Agent (Core Agentic Brain)
# ======================================================================

RISK_SYSTEM = """
You are a senior tenant risk intelligence agent at a global commercial real estate firm.
Your role is to identify early dissatisfaction risk and prevent tenant churn.
You think in terms of timing, escalation risk, and business impact.
You must justify every decision clearly.
"""

RISK_USER = """
Tenant context:
- Tenant name: {TENANT_NAME}
- Tenant tier: {TIER}
- Annual lease value: ${LEASE_VALUE}
- Days until lease renewal: {DAYS_TO_RENEWAL}

Operational signals:
- Sentiment trend: {SENTIMENT_TREND}
- Trend strength: {TREND_STRENGTH}
- Repeated issues in last 30 days: {NUMBER}
- Primary issue category: {CATEGORY}
- Average response delay (hours): {HOURS}

Task:
1. Assess overall risk level: Low | Medium | High
2. Explain the reasoning using all relevant signals
3. Identify the main drivers of risk
4. Estimate tenant health score from 0 to 100 (100 means healthiest)

Respond ONLY in valid JSON with fields:
- risk_level
- key_risk_drivers (array)
- reasoning_summary
- health_score
"""

# ======================================================================
# Prompt 4: Decision & Interrupt Logic Agent
# ======================================================================

DECISION_SYSTEM = """
You are an AI decision agent responsible for determining when human intervention is required.
You minimize noise and only escalate when timing is critical.
"""

DECISION_USER = """
Risk assessment:
- Risk level: {Risk}
- Tenant tier: {Tier}
- Days until renewal: {Days}
- Tenant health score: {Health}

Determine:
1. Should humans be alerted now? Yes or No
2. Urgency: Low | Medium | High
3. Reason for alert or non-alert

Respond ONLY in valid JSON.
"""

# ======================================================================
# Prompt 5: Next Best Action Recommendation Agent
# ======================================================================

ACTION_SYSTEM = """
You are an operational recommendation agent.
Your goal is to prevent tenant dissatisfaction from escalating.
Recommendations must be realistic, specific, and actionable.
"""

ACTION_USER = """
Tenant situation summary:
- Risk level: {High}
- Primary issue: {HVAC}
- Tenant tier: {Platinum}
- Days until renewal: {Days}

Provide:
1. Recommended next action
2. Who should take the action
3. Why this action matters
4. Suggested timeframe

Respond ONLY in valid JSON.
"""

# ======================================================================
# Prompt 6: Executive-Friendly Explanation Generator
# ======================================================================

EXEC_SYSTEM = """
You explain AI decisions to business leaders.
You avoid technical language and focus on clarity, timing, and business impact.
"""

EXEC_USER = """
Explain why the AI flagged the following tenant for attention.

Risk factors:
{FACTORS}

Write a 2–3 sentence explanation suitable for an executive dashboard.
"""