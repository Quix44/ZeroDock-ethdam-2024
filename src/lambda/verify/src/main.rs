mod error;
use bellman::groth16::{
    prepare_verifying_key, verify_proof, PreparedVerifyingKey, Proof, VerifyingKey,
};
use bellman::SynthesisError;
use bls12_381::{Bls12, Scalar};
use error::HashToScalarError;
use lambda_runtime::{service_fn, Error as LambdaError, LambdaEvent};
use serde_json::{json, Value};
#[tokio::main]
async fn main() -> Result<(), lambda_runtime::Error> {
    lambda_runtime::run(service_fn(handler)).await
}

async fn handler(event: LambdaEvent<Value>) -> Result<Value, LambdaError> {
    let public_data = event.payload["event"]
        .get("public_data")
        .and_then(|v| v.as_str())
        .unwrap();
    let proof = event.payload["event"]
        .get("proof")
        .and_then(|v| v.as_str())
        .unwrap();
    let vk = event.payload["event"]
        .get("vk")
        .and_then(|v| v.as_str())
        .unwrap();

    // Convert public data hash to bytes
    let mut public_data_bytes = hex::decode(public_data).unwrap();

    // Resize the byte slice to 64 bytes, filling with zeros if necessary
    public_data_bytes.resize(64, 0);

    // Convert to fixed-size array
    let mut array = [0u8; 64];
    array.copy_from_slice(&public_data_bytes);

    // Convert to scalar
    let public_data_scalar = Scalar::from_bytes_wide(&array);

    // Deserialize proof and verifying key from hex strings
    let decoded_proof =
        hex::decode(&proof).map_err(|_| LambdaError::from("Failed to decode proof hex string"))?;
    let decoded_vk =
        hex::decode(&vk).map_err(|_| LambdaError::from("Failed to decode vk hex string"))?;

    // Create VerifyingKey and Proof objects from deserialized bytes
    let user_vk = VerifyingKey::<Bls12>::read(&decoded_vk[..])
        .map_err(|_| LambdaError::from("Failed to create verifying key from bytes"))?;
    let proof_obj = Proof::<Bls12>::read(&decoded_proof[..])
        .map_err(|_| LambdaError::from("Failed to create proof from bytes"))?;

    // Perform the proof verification
    let public_inputs = vec![public_data_scalar];
    let verification_result = verify(user_vk, proof_obj, public_inputs);

    // Respond with the result of the verification
    match verification_result {
        Ok(verification_response) => Ok(verification_response),
        Err(e) => Ok(json!({ "success": false, "message": e })),
    }
}

fn verify(
    vk: VerifyingKey<Bls12>,
    proof: Proof<Bls12>,
    public_inputs: Vec<Scalar>,
) -> Result<Value, String> {
    print!("Verifying proof...");
    let pvk: PreparedVerifyingKey<Bls12> = prepare_verifying_key(&vk);

    match verify_proof(&pvk, &proof, &public_inputs) {
        Ok(_) => Ok(json!({ "success": true, "message": "Proof verification successful." })),
        Err(e) => {
            Ok(json!({ "success": false, "message": format!("Proof verification failed: {}", e) }))
        }
    }
}

pub fn hash_bytes_to_scalar(hash: &[u8]) -> Result<Scalar, HashToScalarError> {
    let mut array = [0u8; 64];
    array[..64].copy_from_slice(&hash[..]);
    Ok(Scalar::from_bytes_wide(&array))
}

#[test]
fn test_verify() {
    let proof = "a0c7c1c5dad20afcb9a6ba958cf878aa7e5a79bcc4028410621671220965f498dc143566ff6274d2c1d7e2d04a2becd0b64aaaadb0583862b62c492f647e1caab91ea348bf5d9c48aa3e6fb672705d44308d03ffdd4ac13286a88eb75386384601e4e76cfa8998dd4d83b7ec3a87700c6de6de28f4320be62d2d79145bf0424bd28e605268d971211b102bab60c28fc49373890eefb419fe70b6175a888f6cb1b9d0dd0fdecfb13a4e632cdec1c6e72cd60d4f4d033baab88a0c5ba32fc96cc9";
    let public_data = "b34d82a8090aa226fa19d5bae649339f4a9e4bb5e3f1c298dc5f112347bf9270";
    let user_vk = "1285867bc10bda745a70bcae67294a48abf47a0cbf3d121543f99642982215ded64035c4a527eb49fd90f3339d78d5a9111c3e00f50ef193d027852d270b6adae23ddaee5a8ed7525e8a3a561d5ba347fafdafe6b28d2585b2bfd5b1c79100cd0f017647b184ac9dcba58ffe6587aca62b3ed8411252b64433248ace439a29a78441c437513b4b95fc0a3f611693d13c0869fc8b950f8a4feac2f1c3ae4c1c53190389a6193adfba45cab66241b5c5850df936248354eede444366bbbbf92820149c7a49650df8a5bb69ca87cba9f3c727eed4801b175acced62a51580df45ee6c76c272be4b2f96245ebde9e9aec0370016bc1a8ed39da153d2d177bf8271f5fa4326ec0b4e4efe3e84fe16b2a91dc89ea9885368da9b40e6fffd320e5b12850e1b5e36c0226860e50d652443ee080f6c3308660bdd5880a7828dc611c4d5efd21e4fcbb75a31bf8c2cd231ee8e95d715189524901b7bb6175e7799e6b5625ec052f41b7cb23f7f9b80b835d9e8e2a8181aa04e896dae526628d18a0fb086850a5e95a039950bccd5a83809efed6dde398f99fe4855d0a20135130cbbabca1a96194eb2dd942db9b57ed67d9cc1f8720e20c6547ebc76aa6ddc34d54258a38d6cd94b943e75e910d25066c93f36526217b16b7b91c1d3b2edb0c9a73732e88d0b78a9047b70d7c09484648b850d5eb406b925e85daa17b1f6bd0774fe9462e6b153f10247b827866b08a35fc5ba6d9f08dd307c7fe33e475c9cc8ae7d5ebf17e008ed8682b79f42b0ed9888ecc52ffd1b99bf6b20e5b986f4e6e9bf11bd74a61626c7c044a5fd5284e17bd3d7a44b49e06fe48d3d5ba591b3df201c3a14015b42bf1e90da966f3d8c404452daa8c8080b6d8b120ebcdd26a9105f06fc872bfa31131511a9ae523be6ade510d05824d11bd22b93a9ad7f1bab1503c2b621d4f20715edb628c24826a8d9a3d5ccce46a0c43cf772a24af5fd61b1933d3cad9294ec029e06be0a0f3c60876b253022fb4b0a2880b1e663c18d3052a13cac4dc7e08fa45248186c694faea623729104d0f8bed13372755885dcc83be803ea5d7dd30d6e007eccfae7540ea81ba8cbe9aa5cabc3f2153fba443a286b05db7295fce05007fae1b2dac4d54eca83c7fbf1ec361405ab695e0f619e39268015c4af4c09abcee202ad67ca99551813e2fc0a52fed1c5e6573d1f775afac7c5dd14b6d84c00000002009bd6b7896f760b4cb1bf11ac1d79c49c78569f7c4522e7c413d7a4572212b83dcba775f2f081a7f0a9833e2001d62e0f1f69d3fcca11953f13ca5b89b9e6d2db380c8ece14937d4265adc99c9d864e03c8d5753c12a34c1e4aa709169e174210c50c92326220eae3f1ca85492d0e106a6df5e02cdd5346dfa8832573a7d195a02b381eed1689a156025daade5d34ad074d47976dc7a3e89343b3b31d168a1635f41e75ead573e77a43530729f40d1bc80658ca862c27ee90275583b39815b0";

    // Convert hashes to scalar, return error response if conversion fails
    let mut public_data_bytes = hex::decode(public_data).unwrap();
    public_data_bytes.resize(64, 0);

    // Ensure that `public_data_bytes` has exactly 64 bytes
    if public_data_bytes.len() == 64 {
        let public_data_array: [u8; 64] = public_data_bytes
            .try_into()
            .expect("Slice with incorrect length");

        let public_data_scalar = Scalar::from_bytes_wide(&public_data_array);

        // Deserialize proof and verifying key
        let proof_bytes = hex::decode(proof).expect("Failed to decode proof hex");
        let proof_obj: Proof<Bls12> =
            Proof::read(&proof_bytes[..]).expect("Failed to deserialize proof");

        let vk_bytes = hex::decode(user_vk).expect("Failed to decode vk hex");
        let vk = VerifyingKey::<Bls12>::read(&vk_bytes[..])
            .expect("Failed to deserialize verifying key");

        // Call the verify function and assert a successful response
        match verify(vk, proof_obj, vec![public_data_scalar]) {
            Ok(response) => {
                // Convert the response into a Value to check the "success" field
                let response_value: Value = response;
                assert_eq!(
                    response_value["success"], true,
                    "Verification should be successful"
                );
                println!("Verification successful: {}", response_value);
            }
            Err(e) => panic!("Verification failed with error: {}", e),
        }
    } else {
        // Handle the error case where the length is not 64
        print!(
            "ERROR - public_data_bytes has length {}",
            public_data_bytes.len()
        );
    }
}
