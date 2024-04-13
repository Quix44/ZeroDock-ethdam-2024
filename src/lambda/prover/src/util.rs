use crate::error::HashToScalarError;
use bls12_381::Scalar;

pub fn hash_bytes_to_scalar(hash: &[u8]) -> Result<Scalar, HashToScalarError> {
    let mut array = [0u8; 64];
    array[..64].copy_from_slice(&hash[..]);
    Ok(Scalar::from_bytes_wide(&array))
}
