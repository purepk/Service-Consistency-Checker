import mongoose from 'mongoose';

const checkResultSchema = new mongoose.Schema({
    run_id: { type: Number, required: true },
    monitor_id: { type: Number, required: true },
    monitor_name: { type: String, required: true },
    url: { type: String, required: true },
    checked_at: { type: Date, default: Date.now },
    is_up: { type: Boolean, required: true },
    status_code: { type: Number, default: null },
    response_time_ms: { type: Number, default: 0 },
    error_message: { type: String, default: null }
});

checkResultSchema.index({ monitor_id: 1, checked_at: -1 });
checkResultSchema.index({ run_id: 1 });
checkResultSchema.index({ checked_at: 1 }, { expireAfterSeconds: 2592000 }); // TTL index 30 days[cite: 1]

export const CheckResult = mongoose.model('CheckResult', checkResultSchema);