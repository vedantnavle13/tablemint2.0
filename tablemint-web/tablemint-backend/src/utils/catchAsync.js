/**
 * Wraps async route handlers to automatically pass errors to next()
 * Eliminates repetitive try/catch blocks in controllers
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
