
import EventRow from "./EventRow"
import RefreshTable from "./RefreshTable"

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
    const res = await fetch('https://3q6tzgjhlg.execute-api.us-east-1.amazonaws.com/v1/events', { next: { tags: ['events'] } })

    if (!res.ok) {
        // This will activate the closest `error.js` Error Boundary
        throw new Error('Failed to fetch data')
    }

    return res.json()
}

async function EventTable() {

    const data = await getData()

    return (
        <section className="grid container rounded-lg border bg-card text-card-foreground shadow-sm grid-cols-12 p-8">
            <div className="col-span-3 space-y-1.5 p-6">
                <h3 className="text-2xl font-semibold leading-none tracking-tight">Events Table</h3><p className="text-sm text-muted-foreground">View events fired here.</p>

            </div>
            <div className="col-span-1 col-start-12 justify-self-end  space-y-1.5 p-6">
                <RefreshTable />
            </div>
            {data.map((data: any) => <EventRow data={data} key={data.contractAddress} />)
            }

        </section>
    )
}

export default EventTable