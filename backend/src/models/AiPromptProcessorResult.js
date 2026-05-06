import mongoose from 'mongoose'

const AiPromptProcessorResultSchema = new mongoose.Schema(
  {
    _id: { type: String },
    doc_type: { type: String, index: true },
    tenant_id: { type: String, index: true },
  },
  {
    collection: 'ai_prompt_processor_results',
    strict: false,
    timestamps: false,
  },
)

export const AiPromptProcessorResult = mongoose.model(
  'AiPromptProcessorResult',
  AiPromptProcessorResultSchema,
)
