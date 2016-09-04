# Galactic.queue(...)

## NOTE: This documentation is ahead of the codebase.

### Usage

```js
Galactic.queue(items, handler) // starts processing 1 queue item
Galactic.queue(items, handler, processes) // starts processing a specific number of queue items
```

```js
Galactic.queue(items, (item, key, mapper) => {
	mapper.reportProgress(0.25) // report current item progress
	return // whatever you return here is stored in `results`
	return new Promise((resolve) => { // unless its a promise, in which case we wait for that to resolve
		/* do something cool here */
	}).catch(
		mapper.reject
	)
}).onProgress((progress, state, mapper) => { // `progress` is floating point 0.0—1.0
	state = [{key: key, value: item, progress: 1.0}]
	state.forEach((report) => {
		// Make or update progressbar
	})
}).then((results) => { // `results` has same keys as `items`
	
}).catch((e) => { // this happens when an error is thrown, or when `cancel` is called
	e.name // "cancel"
	e.message // description of error, ex. "Reason for canceling"
	e.results // results processed thus far
})
```

```js
mapper.reportProgress(0.25) // report current item progress
mapper.reject("Reason for rejection") // optional string describing why the queue was canceled
mapper.total // total number of items
mapper.remaining // number of items yet to be processed
mapper.progress // remaining divided by total
```
