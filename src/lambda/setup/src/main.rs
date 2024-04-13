mod circuit;

use crate::circuit::SummedHashCircuit;
use bellman::groth16::generate_random_parameters;
use bls12_381::Bls12;
use lambda_runtime::{service_fn, Error, LambdaEvent};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize)]
struct Response {
    pvk: String,
    props: Vec<String>, // Example property, adjust according to your needs
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    lambda_runtime::run(service_fn(handler)).await
}

async fn handler(_: LambdaEvent<Value>) -> Result<Value, Error> {
    let mut rng = OsRng;
    let _params = generate_random_parameters::<Bls12, _, _>(
        SummedHashCircuit {
            a: None,
            b: None,
            c: None,
        },
        &mut rng,
    )
    .unwrap();
    let mut params_v: Vec<u8> = vec![];
    _params.write(&mut params_v).unwrap();
    let params_string = hex::encode(params_v);
    let mut vk_v = vec![];
    _params.vk.write(&mut vk_v).unwrap();
    let pvk_string = hex::encode(vk_v);

    // Constructing the response
    let response = Response {
        pvk: pvk_string,
        props: vec![params_string],
    };

    // Serialize your response into JSON
    let json_response = serde_json::to_value(response)?;

    Ok(json_response)
}
