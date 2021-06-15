use dropshot::*;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::context::Context;

#[derive(JsonSchema, Serialize, Deserialize)]
pub struct LoginRequest {
    username: String,
    password: String,
}

#[derive(JsonSchema, Serialize, Deserialize)]
pub struct LoginResponse {
    token: String,
}

#[endpoint {
    method = POST,
    path = "/login",
}]
pub async fn login_handler(
    _rqctx: Arc<RequestContext<Context>>,
    body: TypedBody<LoginRequest>,
) -> Result<HttpResponseOk<LoginResponse>, HttpError> {
    let req = body.into_inner();
    let res = LoginResponse {
        token: req.username,
    };
    Ok(HttpResponseOk(res))
}
