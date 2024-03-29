export const configurationSH = {
  issuer: 'https://eid.sh.ch',
  authorization_endpoint: 'https://eid.sh.ch/authorize',
  token_endpoint: 'https://eid.sh.ch/token',
  userinfo_endpoint: 'https://eid.sh.ch/userinfo',
  end_session_endpoint: 'https://eid.sh.ch/end-session',
  introspection_endpoint: 'https://eid.sh.ch/introspect',
  response_types_supported: ['code', 'id_token', 'id_token token', 'code token', 'code id_token', 'code id_token token'],
  jwks_uri: 'https://eid.sh.ch/jwks',
  id_token_signing_alg_values_supported: ['HS256', 'RS256'],
  subject_types_supported: ['public'],
  token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
  check_session_iframe: 'https://eid.sh.ch/check-session-iframe',
  redirect_uri_dev: 'http://localhost:8100/return',
  redirect_uri_prod: 'https://owlly.ch/return',
  redirect_uri_app: 'owlly://return',
};
//https://eid.sh.ch/.well-known/openid-configuration
