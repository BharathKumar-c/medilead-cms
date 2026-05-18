const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Helper to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));

    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: formattedErrors,
    });

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: formattedErrors,
    });
  }
  next();
};

// Auth validations
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty'),
  handleValidationErrors,
];

const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['super_admin', 'manager', 'telecaller', 'staff'])
    .withMessage('Invalid role'),
  body('specialty')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Specialty must be less than 255 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  handleValidationErrors,
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors,
];

// Lead validations (for CREATE - name required)
const validateLead = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Patient name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('alternate_contact')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Alternate contact must be 10 digits'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('uhid')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('UHID must be less than 50 characters'),
  body('dob')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Address must be less than 1000 characters'),
  body('pincode')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('Pincode must be 6 digits'),
  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  body('state')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must be less than 100 characters'),
  body('country')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must be less than 100 characters'),
  body('status')
    .optional()
    .isIn(['New', 'Contacted', 'Interested', 'Follow-up', 'Appointment Booked', 'Closed', 'Rejected'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['High', 'Medium', 'Low'])
    .withMessage('Invalid priority'),
  body('lead_source')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Lead source must be less than 100 characters'),
  body('assigned_to')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Invalid assigned user'),
  body('clinical_remarks')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Clinical remarks must be less than 5000 characters'),
  handleValidationErrors,
];

// Lead update validations (for UPDATE - all fields optional)
const validateLeadUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('alternate_contact')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Alternate contact must be 10 digits'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('uhid')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('UHID must be less than 50 characters'),
  body('dob')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Please provide a valid date of birth'),
  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Address must be less than 1000 characters'),
  body('pincode')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage('Pincode must be 6 digits'),
  body('city')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  body('state')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must be less than 100 characters'),
  body('country')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must be less than 100 characters'),
  body('status')
    .optional()
    .isIn(['New', 'Contacted', 'Interested', 'Follow-up', 'Appointment Booked', 'Closed', 'Rejected'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['High', 'Medium', 'Low'])
    .withMessage('Invalid priority'),
  body('lead_source')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Lead source must be less than 100 characters'),
  body('assigned_to')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Invalid assigned user'),
  body('clinical_remarks')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Clinical remarks must be less than 5000 characters'),
  handleValidationErrors,
];

// Appointment update validations (for UPDATE - all fields optional)
const validateAppointmentUpdate = [
  body('patient_name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('provider_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Invalid provider'),
  body('provider_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Provider name must be less than 255 characters'),
  body('appointment_date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('appointment_time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid time in HH:MM format'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must be less than 2000 characters'),
  body('status')
    .optional()
    .isIn(['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'No Show'])
    .withMessage('Invalid appointment status'),
  handleValidationErrors,
];

// Reschedule validations
const validateReschedule = [
  body('appointment_date')
    .notEmpty()
    .withMessage('New date is required')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('appointment_time')
    .notEmpty()
    .withMessage('New time is required')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid time in HH:MM format'),
  handleValidationErrors,
];

// Call update validations
const validateCallUpdate = [
  body('status')
    .optional()
    .isIn(['ringing', 'connected', 'disconnected', 'missed', 'hold'])
    .withMessage('Invalid call status'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must be less than 2000 characters'),
  handleValidationErrors,
];

// SIP event validations
const validateSipEvent = [
  body('event')
    .notEmpty()
    .withMessage('Event type is required')
    .isIn(['incoming', 'outgoing', 'answered', 'ended', 'missed', 'hold', 'unhold'])
    .withMessage('Invalid SIP event type'),
  body('call_id')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Call ID must be less than 100 characters'),
  body('caller')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Caller number must be 10-15 digits'),
  body('callee')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Callee number must be 10-15 digits'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a non-negative integer'),
  handleValidationErrors,
];

// Appointment validations
const validateAppointment = [
  body('patient_name')
    .trim()
    .notEmpty()
    .withMessage('Patient name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address'),
  body('department')
    .trim()
    .notEmpty()
    .withMessage('Department is required')
    .isLength({ max: 100 })
    .withMessage('Department must be less than 100 characters'),
  body('provider_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Invalid provider'),
  body('provider_name')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Provider name must be less than 255 characters'),
  body('appointment_date')
    .notEmpty()
    .withMessage('Appointment date is required')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  body('appointment_time')
    .notEmpty()
    .withMessage('Appointment time is required')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid time in HH:MM format'),
  body('notes')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must be less than 2000 characters'),
  handleValidationErrors,
];

// Call log validations
const validateCallLog = [
  body('caller_number')
    .trim()
    .notEmpty()
    .withMessage('Caller number is required')
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Caller number must be 10-15 digits'),
  body('callee_number')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Callee number must be 10-15 digits'),
  body('direction')
    .optional()
    .isIn(['inbound', 'outbound'])
    .withMessage('Direction must be inbound or outbound'),
  body('lead_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Invalid lead ID'),
  handleValidationErrors,
];

// Notification validations
const validateNotification = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Notification title is required')
    .isLength({ max: 500 })
    .withMessage('Title must be less than 500 characters'),
  body('type')
    .optional()
    .isIn(['urgent', 'warning', 'success', 'info'])
    .withMessage('Invalid notification type'),
  body('link')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Link must be less than 255 characters'),
  body('user_id')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Invalid user ID'),
  handleValidationErrors,
];

// User management validations
const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(['super_admin', 'manager', 'telecaller', 'staff'])
    .withMessage('Invalid role'),
  body('specialty')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Specialty must be less than 255 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),
  handleValidationErrors,
];

// Profile update validations
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('specialty')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Specialty must be less than 255 characters'),
  body('phone')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('avatar_url')
    .optional({ checkFalsy: true })
    .trim()
    .isURL()
    .withMessage('Please provide a valid URL for avatar'),
  handleValidationErrors,
];

// Settings validations
const validateSettings = [
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Invalid theme'),
  body('two_factor_enabled')
    .optional()
    .isBoolean()
    .withMessage('two_factor_enabled must be a boolean'),
  body('email_notifications')
    .optional()
    .isBoolean()
    .withMessage('email_notifications must be a boolean'),
  handleValidationErrors,
];

// Parameter validations
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Invalid ID parameter'),
  handleValidationErrors,
];

// Query validations
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

const validateLeadQuery = [
  ...validatePagination,
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must be less than 100 characters'),
  query('status')
    .optional()
    .isIn(['All', 'New', 'Contacted', 'Interested', 'Follow-up', 'Appointment Booked', 'Closed', 'Rejected'])
    .withMessage('Invalid status filter'),
  query('priority')
    .optional()
    .isIn(['High', 'Medium', 'Low'])
    .withMessage('Invalid priority filter'),
  query('sort')
    .optional()
    .isIn(['created_at', 'name', 'last_call_date', 'status', 'priority'])
    .withMessage('Invalid sort field'),
  query('order')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Invalid sort order'),
  handleValidationErrors,
];

module.exports = {
  validateLogin,
  validateRegister,
  validateChangePassword,
  validateLead,
  validateLeadUpdate,
  validateAppointment,
  validateAppointmentUpdate,
  validateReschedule,
  validateCallLog,
  validateCallUpdate,
  validateSipEvent,
  validateNotification,
  validateUserUpdate,
  validateProfileUpdate,
  validateSettings,
  validateId,
  validatePagination,
  validateLeadQuery,
  handleValidationErrors,
};
