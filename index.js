class Usom {
    #usomInfo = {
		URLList: 'https://www.usom.gov.tr/url-list.txt',
	}

    getUSOMList() {
        return fetch(this.#usomInfo.URLList)
        .then(list => list.text())
        .then(list => list.split('\n'))
        .catch(err => console.log('Failed to getList'));
    }
}

(function() {
	let usomURLList = [];
	chrome.runtime.onInstalled.addListener( () => {
		if (navigator.onLine) {
			usomURLList = new Usom().getUSOMList();
		}
	});

	chrome.tabs.onUpdated.addListener(function(tabid, info, tab) {
		if(info?.url) {
			console.log(tabid, new URL(info.url).hostname, usomURLList)
			
		}
	});
})();
