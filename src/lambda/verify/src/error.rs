use bellman::SynthesisError;
use std::fmt;

/// An enumeration of potential errors encountered in the hashing to scalar process.
#[derive(Debug)]
pub enum HashToScalarError {
    InvalidLength,
    // Add more error types as needed
    // For example: Other(String),
}

/// Implement the `Display` trait for `HashToScalarError`.
impl fmt::Display for HashToScalarError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            HashToScalarError::InvalidLength => write!(f, "Invalid hash length"),
            // Handle other errors here
            // For example: HashToScalarError::Other(msg) => write!(f, "{}", msg),
        }
    }
}

impl From<SynthesisError> for HashToScalarError {
    fn from(err: SynthesisError) -> Self {
        // You can decide how to handle the conversion.
        // For example, you can create a new variant in `HashToScalarError`
        // to represent `SynthesisError`, or you can log the error and return
        // a generic `HashToScalarError` variant.
        // Here's a simple implementation:
        eprintln!("Synthesis error occurred: {:?}", err);
        HashToScalarError::InvalidLength
    }
}

/// Implement the `Error` trait for `HashToScalarError`.
impl std::error::Error for HashToScalarError {}
