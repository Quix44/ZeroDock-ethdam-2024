# event will be a struct that comes from the contract event
# It will contain the args of the emitted event in an array so [1n, 2n] - event["args"]

def main(event, _):
    print("Hello World! and a simple sum")
    a = 5
    b = 7
    result = a + b
    print(f"The sum of {a} and {b} is {result}")
    return result
if __name__ == "__main__":
    main(None, None)
