def handler(event, _):
    [a, b] = event["args"]
    sum = int(a) + int(b)
    print(sum)
    return sum
