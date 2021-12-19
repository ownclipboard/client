class Flight {

    /**
     * Find the flight with given destinations
     * @param from -from destination
     * @param to - to destination
     */
    static findFlight(from: string, to: string): void {
        console.log(`Searching flight from ${from} to ${to}`);
    }


    /**
     * Another Function
     */
    static anotherFunction(){
        console.log("Another function");
    }
}

export = Flight;


// Another file.
Flight.findFlight("New York", "Paris");
Flight.anotherFunction();
