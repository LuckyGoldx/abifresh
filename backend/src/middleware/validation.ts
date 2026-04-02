import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check validation results and return errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map((err: any) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// ==================== AUTH VALIDATIONS ====================

export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number'),
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Full name must be under 100 characters'),
  body('role')
    .isIn(['admin', 'sales', 'sales_staff', 'commission_staff', 'non_commission_staff'])
    .withMessage('Invalid role specified'),
  body('store_location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Store location must be under 100 characters'),
  handleValidationErrors,
];

export const validateLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ max: 100 })
    .withMessage('Username must be under 100 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

export const validateChangePassword = [
  body('new_password')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain uppercase, lowercase, and a number'),
  body('old_password')
    .optional(),
  handleValidationErrors,
];

export const validateUpdateProfile = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must be under 20 characters'),
  handleValidationErrors,
];

// ==================== SALES VALIDATIONS ====================

export const validateRecordSale = [
  body('item_id')
    .trim()
    .notEmpty()
    .withMessage('Item ID is required'),
  body('quantity')
    .isFloat({ min: 0.5 })
    .withMessage('Quantity must be at least 0.5')
    .custom((value) => Number.isInteger(parseFloat(value) * 2))
    .withMessage('Quantity must be a multiple of 0.5 (whole or half bags only)'),

  body('payment_method')
    .isIn(['cash', 'pos', 'transfer'])
    .withMessage('Payment method must be cash, pos, or transfer'),
  body('buyer_type')
    .notEmpty()
    .withMessage('Buyer type is required'),
  body('store_location')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  handleValidationErrors,
];

export const validateCreateSale = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.item_id')
    .notEmpty()
    .withMessage('Each item must have an item_id'),
  body('items.*.quantity')
    .isFloat({ min: 0.5 })
    .withMessage('Each item quantity must be at least 0.5')
    .custom((value) => Number.isInteger(parseFloat(value) * 2))
    .withMessage('Each item quantity must be a multiple of 0.5 (whole or half bags only)'),

  body('items.*.unit_price')
    .isFloat({ min: 0 })
    .withMessage('Each item must have a valid unit_price'),
  body('total_amount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a positive number'),
  body('payment_method')
    .isIn(['cash', 'pos', 'transfer'])
    .withMessage('Payment method must be cash, pos, or transfer'),
  handleValidationErrors,
];

export const validatePostItems = [
  body('staff_id')
    .trim()
    .notEmpty()
    .withMessage('Staff ID is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.item_id')
    .notEmpty()
    .withMessage('Each item must have an item_id'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each item must have a positive quantity'),
  body('items.*.unit_price')
    .isFloat({ min: 0 })
    .withMessage('Each item must have a valid unit_price'),
  handleValidationErrors,
];

export const validatePaymentRequest = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('payment_method')
    .isIn(['cash', 'online', 'bank_deposit', 'pos'])
    .withMessage('Payment method must be cash, online, bank_deposit, or pos'),
  body('reference_number')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference number must be under 100 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be under 500 characters'),
  handleValidationErrors,
];

export const validateExpense = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 100 })
    .withMessage('Category must be under 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be under 500 characters'),
  handleValidationErrors,
];

// ==================== INVENTORY VALIDATIONS ====================

export const validateAddItem = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .isLength({ max: 255 })
    .withMessage('Item name must be under 255 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 100 })
    .withMessage('Category must be under 100 characters'),
  body('unit_price')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a non-negative number'),
  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ max: 100 })
    .withMessage('SKU must be under 100 characters'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
  body('commission')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Commission must be a non-negative number'),
  handleValidationErrors,
];

export const validateUpdateItem = [
  param('id')
    .notEmpty()
    .withMessage('Item ID is required'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Item name must be under 255 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be under 100 characters'),
  body('unit_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a non-negative number'),
  body('main_store_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Main store quantity must be non-negative'),
  body('commission')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Commission must be a non-negative number'),
  handleValidationErrors,
];

// ==================== ADMIN VALIDATIONS ====================

export const validateCreateStaff = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('full_name')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Full name must be under 100 characters'),
  body('role')
    .isIn(['admin', 'sales', 'sales_staff', 'commission_staff', 'non_commission_staff'])
    .withMessage('Invalid role specified'),
  body('username')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Username must be under 50 characters'),
  body('phone_number')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number must be under 20 characters'),
  body('store_location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Store location must be under 100 characters'),
  handleValidationErrors,
];

export const validateSetCommission = [
  body('staff_id')
    .trim()
    .notEmpty()
    .withMessage('Staff ID is required'),
  body('item_id')
    .trim()
    .notEmpty()
    .withMessage('Item ID is required'),
  body('commission_percentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Commission percentage must be between 0 and 100'),
  handleValidationErrors,
];

export const validateApproveRejectPayment = [
  param('id')
    .notEmpty()
    .withMessage('Payment ID is required'),
  handleValidationErrors,
];

export const validateRejectPaymentWithReason = [
  param('id')
    .notEmpty()
    .withMessage('Payment ID is required'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must be under 500 characters'),
  handleValidationErrors,
];

export const validateUpdateStaff = [
  param('id')
    .notEmpty()
    .withMessage('Staff ID is required'),
  body('full_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Full name must be under 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('username')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Username must be under 50 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'sales', 'sales_staff', 'commission_staff', 'non_commission_staff'])
    .withMessage('Invalid role specified'),
  handleValidationErrors,
];

// ==================== STAFF ROUTE VALIDATIONS ====================

export const validatePostItem = [
  body('item_id')
    .trim()
    .notEmpty()
    .withMessage('Item ID is required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  handleValidationErrors,
];

export const validateAcceptPostedItem = [
  param('id')
    .notEmpty()
    .withMessage('Posted item ID is required'),
  handleValidationErrors,
];

export const validateRejectPostedItem = [
  param('id')
    .notEmpty()
    .withMessage('Posted item ID is required'),
  body('reject_reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reject reason must be under 500 characters'),
  handleValidationErrors,
];

export const validateReturnedItemAction = [
  param('id')
    .notEmpty()
    .withMessage('Return ID is required'),
  handleValidationErrors,
];

export const validateRejectReturn = [
  param('id')
    .notEmpty()
    .withMessage('Return ID is required'),
  body('reject_reason')
    .trim()
    .notEmpty()
    .withMessage('Reject reason is required')
    .isLength({ max: 500 })
    .withMessage('Reject reason must be under 500 characters'),
  handleValidationErrors,
];

// ==================== QUERY VALIDATIONS ====================

export const validatePaginationQuery = [
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

export const validateIdParam = [
  param('id')
    .notEmpty()
    .withMessage('ID parameter is required'),
  handleValidationErrors,
];
