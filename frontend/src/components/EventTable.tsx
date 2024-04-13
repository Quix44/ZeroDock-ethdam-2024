
import EventRow from "./EventRow"

const json = [{
    "contractAddress": "0x5c8...b3F3",
    "eventName": "Process",
    "timestamp": "date",
    "containerName": "foo",
    "chain": "Base",
    "url": "link-to-basescan"
}, {
    "contractAddress": "0x5c8...b3F3",
    "eventName": "Process",
    "timestamp": "date",
    "containerName": "foo",
    "chain": "Base",
    "url": "link-to-basescan"
}, {
    "contractAddress": "0x5c8...b3F3",
    "eventName": "Process",
    "timestamp": "date",
    "containerName": "foo",
    "chain": "Base",
    "url": "link-to-basescan"
}]


async function getData() {
    // const res = await fetch('../api/data.json')

    // if (!res.ok) {
    //     // This will activate the closest `error.js` Error Boundary
    //     throw new Error('Failed to fetch data')
    // }

    return json
}

async function EventTable() {

    const data = await getData()

    return (
        <section className="grid container rounded-lg border bg-card text-card-foreground shadow-sm grid-cols-12 p-8">
            <div className="col-span-3 space-y-1.5 p-6"><h3 className="text-2xl font-semibold leading-none tracking-tight">Events Table</h3><p className="text-sm text-muted-foreground">View events fired here.</p></div>
            {json.map((data) => <EventRow data={data} />)
            }

        </section>
    )
}

export default EventTable