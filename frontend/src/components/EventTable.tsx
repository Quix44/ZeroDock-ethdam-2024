import EventRow from "./EventRow"

function EventTable() {
    return (
        <section className="grid container rounded-lg border bg-card text-card-foreground shadow-sm grid-cols-12 p-8">
            <div className="col-span-3 space-y-1.5 p-6"><h3 className="text-2xl font-semibold leading-none tracking-tight">Events Table</h3><p className="text-sm text-muted-foreground">View events fired here.</p></div>
            <EventRow />
            <EventRow />
            <EventRow />
            <EventRow />
        </section>
    )
}

export default EventTable