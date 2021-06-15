use crate::context::Context;
use crate::hasura::{CreateUserMutation, CreateUserRequest, CreateUserResponse};
use bcrypt::{hash, DEFAULT_COST};
use dropshot::*;
use graphql_client::{Response};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(JsonSchema, Serialize, Deserialize)]
pub struct RegisterRequest {
    username: String,
    password: String,
    email: String,
}

#[derive(JsonSchema, Serialize, Deserialize)]
pub struct RegisterResponse {
    username: String,
    email: String,
}

#[endpoint { method = POST, path = "/register" }]
pub async fn register_handler(
    _rqctx: Arc<RequestContext<Context>>,
    body: TypedBody<RegisterRequest>,
) -> Result<HttpResponseOk<RegisterResponse>, HttpError> {
    let req = body.into_inner();

    let password_hash = match hash(req.password, DEFAULT_COST) {
        Ok(h) => h,
        Err(e) => return Err(HttpError::for_internal_error(e.to_string())),
    };

    let gql_variables = CreateUserRequest {
        username: Some(req.username.to_owned()),
        email: Some(req.email.to_owned()),
        password_hash: Some(password_hash),
    };

    let gql_body = CreateUserMutation::build_query(gql_variables);

    let client = reqwest::Client::new();
    let res = client
        .post("https://hasura.rou.st/v1/graphql")
        .header("x-hasura-admin-secret", "fancytunakitchenswamp")
        .json(&gql_body)
        .send()
        .await;

    let res = match res {
        Ok(v) => v,
        Err(e) => return Err(HttpError::for_internal_error(e.to_string())),
    };

    let res: Response<CreateUserResponse> = match res.json().await {
        Ok(v) => v,
        Err(e) => return Err(HttpError::for_internal_error(e.to_string())),
    };

    if let Some(errs) = res.errors {
        return Err(HttpError::for_internal_error(
            errs.into_iter().map(|e| e.to_string()).collect(),
        ));
    }

    match res.data.and_then(|d| d.insert_users_one) {
        None => Err(HttpError::for_internal_error(
            "No data returned from create user mutation".to_string(),
        )),
        Some(data) => Ok(HttpResponseOk(RegisterResponse {
            username: data.username,
            email: data.email,
        })),
    }
}
