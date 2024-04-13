// circuit.rs
use bellman::{Circuit, ConstraintSystem, SynthesisError};
use bls12_381::Scalar;

pub struct SummedHashCircuit {
    pub a: Option<Scalar>,
    pub b: Option<Scalar>,
    pub c: Option<Scalar>,
}

impl Circuit<Scalar> for SummedHashCircuit {
    fn synthesize<CS: ConstraintSystem<Scalar>>(self, cs: &mut CS) -> Result<(), SynthesisError> {
        // Allocate `a` as an input variable
        let a_var = cs.alloc(|| "a", || self.a.ok_or(SynthesisError::AssignmentMissing))?;

        // Allocate `b` as an input variable
        let b_var = cs.alloc(|| "b", || self.b.ok_or(SynthesisError::AssignmentMissing))?;

        // Allocate `c` as a witness variable, since it's the result of `a + b` and not provided by the verifier
        let c_var = cs.alloc_input(|| "c", || self.c.ok_or(SynthesisError::AssignmentMissing))?;

        // Enforce the constraint that `a + b = c`
        cs.enforce(
            || "a + b = c",
            |lc| lc + a_var + b_var,
            |lc| lc + CS::one(),
            |lc| lc + c_var,
        );

        Ok(())
    }
}
