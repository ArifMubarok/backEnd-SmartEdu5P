const catchAsyncError = (func) => {
  return function (req, res, next) {
    func(req, res, next).catch(next);
  };
};

export default catchAsyncError;
