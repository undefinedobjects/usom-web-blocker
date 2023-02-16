(function() {
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
	
	const isIpAddress = (ipAddress) => /^((\d){1,3}\.){3}(\d){1,3}$/.test(ipAddress)


	let usomURLList;
	chrome.runtime.onInstalled.addListener( () => {
		if (navigator.onLine) {
			usomURLList = new Usom().getUSOMList().then(list => list);
		}
	});

	chrome.tabs.onUpdated.addListener(function(tabid, info, tab) {
		if(info?.url) {
			let url = new URL(info.url);

			if(!isIpAddress(url)) {
				url = url.hostname.split('.');
				url.shift();
				url = url.join('.');
			}

			usomURLList.then(list => {
				if(!list.includes(url)) {
					return;
				}
				
				chrome.declarativeNetRequest.updateDynamicRules({
					addRules:[{
					   'id': 1,
					   'priority': 1,
					   'action': { 'type': 'block' },
					   'condition': { 'urlFilter': url, 'resourceTypes': ['main_frame'] }
					}],
					removeRuleIds: [1]
				})			
			})
		}
	});
})();
