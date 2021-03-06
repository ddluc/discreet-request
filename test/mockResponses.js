/**
 * Defines mock http responses
 */

module.exports = {
  success: {
    statusCode: 200,
    statusMessage: 'OK',
    body: 'mock_success_body_content',
  },
  serverError: {
    statusCode: 500,
    statusMessage: 'ServerError',
    body: 'mock_server_error_body'
  },
  forbidden: {
    statusCode: 403,
    statusMessage: 'Forbidden',
    body: 'mock_forbidden_body_content'
  },
  notFound: {
    statusCode: 404,
    statusMessage: 'Not Found',
    body: 'mock_not_found_body_content'
  },
  proxyError: {
    statusCode: 407,
    statusMessage: 'Proxy Authentication Required',
    body: 'mock_proxy_auth_error_body_content'
  }
};
