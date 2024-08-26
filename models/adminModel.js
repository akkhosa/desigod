// adminModel.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: { type: [String], default: ['editor'] }, // Support for multiple roles
    twoFactorSecret: { type: String }, // For 2FA
    lastPasswordChange: { type: Date, default: Date.now }, // For enforcing password rotation
}, { timestamps: true });

// Password Policy Enforcement
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();

    const password = this.password;
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[\W_]/.test(password);

    if (password.length < minLength || !hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
        return next(new Error('Password does not meet security requirements'));
    }

    this.password = await bcrypt.hash(password, 10);
    this.lastPasswordChange = Date.now();
    next();
});

// Audit log for admin actions with change tracking
adminSchema.methods.logAction = function(action, details) {
    const log = new AuditLog({
        adminId: this._id,
        action,
        details,
        timestamp: new Date(),
    });
    return log.save();
};

const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    action: { type: String, required: true },
    details: { type: Object, default: {} },
    timestamp: { type: Date, required: true },
}));

module.exports = mongoose.model('Admin', adminSchema);

