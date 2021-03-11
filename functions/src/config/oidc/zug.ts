export const configurationZG = {
  issuer: 'https://gateway.ezug.ch',
  authorization_endpoint: 'https://gateway.ezug.ch/authorize',
  token_endpoint: 'https://gateway.ezug.ch/token',
  userinfo_endpoint: 'https://gateway.ezug.ch/userinfo',
  end_session_endpoint: 'https://gateway.ezug.ch/end-session',
  introspection_endpoint: 'https://gateway.ezug.ch/introspect',
  response_types_supported: ['code', 'id_token', 'id_token token', 'code token', 'code id_token', 'code id_token token'],
  jwks_uri: 'https://gateway.ezug.ch/jwks',
  id_token_signing_alg_values_supported: ['HS256', 'RS256'],
  subject_types_supported: ['public'],
  token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
  redirect_uri_dev: 'http://localhost:8100/return',
  redirect_uri_prod: 'https://owlly.ch/return',
  redirect_uri_app: 'owlly://return',
};
//https://gateway.ezug.ch/.well-known/openid-configuration
