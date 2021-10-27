const notFound = () => {
  const error = new Error("Not Found");
  error.status = 404;
  return error;
};

const response = (error) => {
  const status = (error.response && error.response.status) || error.status;
  return {
    error: {
      status: status,
      message: error.message,
    },
  };
};

module.exports = {
  notFound: notFound,
  response: response,
};
