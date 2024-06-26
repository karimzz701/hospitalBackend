const sendErrorForDev = (err, res) => {
  const error = res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
  return error;
};

const sendErrorForProd = (err, res) => {
  const error = res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
  return error;
};

const globalError = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (process.env.NODE_ENV === "development") {
    return sendErrorForDev(err, res);
  } else {
    return sendErrorForProd(err, res);
  }
};

export default globalError;
