mod circuit;
mod circuit_params;
mod error;
mod util;
use bellman::groth16::{create_random_proof, Parameters};
use bellman::SynthesisError;
use bls12_381::Bls12;
use circuit::SummedHashCircuit;
use lambda_runtime::Error;
use lambda_runtime::{service_fn, LambdaEvent};
use rand_core::OsRng;
use serde_json::{json, Value};
use util::hash_bytes_to_scalar;
#[tokio::main]
async fn main() -> Result<(), lambda_runtime::Error> {
    lambda_runtime::run(service_fn(handler)).await
}

async fn handler(event: LambdaEvent<Value>) -> Result<Value, Error> {
    // extract docker sha and input data from lambda call
    let sha = event.payload["event"].get("sha").and_then(|v| v.as_str());
    let input_data = event.payload["event"]
        .get("input_data")
        .and_then(|v| v.as_str());
    // switch based on matchs
    let sha_str = match sha {
        Some(sha) => sha,
        None => return Err(Error::from("No Docker SHA value not found!")),
    };

    //TODO: Hash the input data, do we need to take specific json property out of input body ?
    let input_str = match input_data {
        Some(data) => data,
        None => return Err(Error::from("No Input SHA value found!")),
    };

    return create_handler_proof(sha_str, input_str);
}

pub fn create_handler_proof(input_data: &str, docker_image_digest: &str) -> Result<Value, Error> {
    let mut rng = OsRng;
    // convert inputs and create c (output)
    let sha = hash_bytes_to_scalar(docker_image_digest.as_bytes())
        .map_err(|_| SynthesisError::AssignmentMissing)?; // Convert HashToScalarError to SynthesisError
    let transaction_hash = hash_bytes_to_scalar(input_data.as_bytes())
        .map_err(|_| SynthesisError::AssignmentMissing)?; // Convert HashToScalarError to SynthesisError
    let result = sha + transaction_hash;
    let decoded_params = match circuit_params::get_params() {
        Ok(params) => params,
        Err(e) => {
            eprintln!("Failed to decode parameters: {}", e);
            return Err(Error::from("Failed to decode parameters"));
        }
    };

    let deserialized_params: Parameters<Bls12> =
        Parameters::read(&decoded_params[..], false).unwrap();
    // Replace the create_random_proof call with a match statement
    let proof = match create_random_proof(
        SummedHashCircuit {
            a: Some(sha),
            b: Some(transaction_hash),
            c: Some(result),
        },
        &deserialized_params,
        &mut rng,
    ) {
        Ok(proof) => proof,
        Err(e) => {
            // Handle the error appropriately
            eprintln!("Error creating proof: {:?}", e);
            // Here we return from the function with a conversion of the error into the `Error` type that the function returns
            return Err(Error::from(format!("Error creating proof: {:?}", e)));
        }
    };
    let mut v = vec![];
    proof.write(&mut v).unwrap();
    let encoded_proof = hex::encode(v);
    let new_v = result.to_bytes();

    Ok(json!({ "proof": encoded_proof, "public_data": hex::encode(new_v) }))
}

#[cfg(test)]
mod tests {
    use crate::create_handler_proof;
    use serde_json::Value;

    #[test]
    pub fn generate_proof() {
        let sha_str = "afa6d690bf9290a6a81d28bdfd2adacda8660afee70c3d49a67f5e98877832e9";
        let input_str = "bd0d3080c1bb16fc089f27b1654a97098f6e272c9d59fd462b880656b963506a";
        // Call the function and unwrap to get the JSON response
        let result = create_handler_proof(input_str, sha_str);

        // Check if the result is Ok and contains the expected JSON
        match result {
            Ok(json) => {
                // If result is Ok, print the JSON
                println!("Generated proof: {:?}", json);
                // You can also perform assertions on your json if needed.
                if let Value::Object(obj) = json {
                    if let Some(proof_value) = obj.get("proof") {
                        println!("Proof value: {:?}", proof_value);
                        // Add more assertions here if necessary
                    } else {
                        panic!("Proof not found in JSON response");
                    }
                } else {
                    panic!("Invalid JSON response");
                }
            }
            Err(e) => {
                // If there was an error, panic with the error message
                panic!("Failed to generate proof: {:?}", e);
            }
        }
    }
}
