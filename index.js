(function() {
	class USOM {
		#USOMInfo = {
			URLList: 'https://www.usom.gov.tr/url-list.txt',
		}
	
		getUSOMList() {
			return fetch(this.#USOMInfo.URLList)
			.then(list => list.text())
			.then(list => list.split('\n'))
			.catch(err => console.log('Failed to getList'));
		}
	}
	
	const isIpAddress = (ipAddress) => /^((\d){1,3}\.){3}(\d){1,3}$/.test(ipAddress);

	let USOMURLList;
	chrome.runtime.onInstalled.addListener(() => {
		if (navigator.onLine) {
			USOMURLList = new USOM().getUSOMList();
		}
	});

	chrome.tabs.onUpdated.addListener(function(tabid, info, tab) {
		if(info?.url) {
			let url = new URL(info.url).hostname;
	
			if(!isIpAddress(url)) {
				url = url.split('.');

				if(url.length > 2) {
					url.shift();
				}
				
				url = url.join('.');
			}

			USOMURLList.then(list => {
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
