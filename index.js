class IndexedDBOperator {
	constructor({version, name}) {
	this.dbConnection =  new Promise((resolve, reject) => {
		let _dbConnection;
		const request = indexedDB.open(name, version);
	
		request.onerror = e => {
		  reject(e);
		}
	
		request.onsuccess = e => {
			_dbConnection = request.result;
	
		  resolve(_dbConnection);
		}
	
		request.onupgradeneeded = e => {
			_dbConnection = e.target.result;
	
		  resolve(_dbConnection);
		}
	  })

	  return IndexedDBOperator.instance;
	}
  
	static getInstance(version, name) {
	  return new IndexedDBOperator(version, name);
	}
  
	getVersion() {
	  return new Promise((resolve, reject) => {
		this.dbConnection.then(db => resolve(db.version)).catch(err => reject(err));
	  });
	}
  
	containsObjectStore(name) {
	  return new Promise((resolve, reject) => {
		this.dbConnection.then(db => {
		  try {
			resolve(db.objectStoreNames.contains(name));
		  } catch(err) {
			reject(err);
		  }
		})
	  });
	}
  
	createObjectStore(name, keyPath) {
	  return new Promise((resolve, reject) => {
		this.dbConnection.then(db => {
		  if(!db.objectStoreNames.contains(name)) {
			try {
			  const objectStore = db.createObjectStore(name, { keyPath: keyPath, autoIncrement: true });
  
			  resolve(objectStore);
			} catch(err) {
			  reject(err);
			}
		  }
		});
	  });
	}
  
	create(objectStore, data) {
	  return new Promise((resolve, reject) => {
		this.dbConnection.then(db => {
		  const request = db.transaction([objectStore], 'readwrite').objectStore(objectStore).add(data);
  
		  request.onsuccess = e => {
			resolve(e);
		  }
  
		  request.onerror = e => {
			reject(e);
		  }
		});
	  });
	}
  
	read(objectStore, searchIndex) {
	  return new Promise((resolve, reject) => {
		this.dbConnection.then(db => {
		  const request = db.transaction([objectStore]).objectStore(objectStore).get(searchIndex);
  
		  request.onerror = e => {
			reject(e);
		  };
  
		  request.onsuccess = e => {
			resolve(request.result);
		  };
		});
	  });
	}
  
	readAll(objectStore) {
	  return new Promise((resolve, reject) => {
		this.dbConnection.then(db => {
		  const request = db.transaction([objectStore], 'readonly').objectStore(objectStore).openCursor();
		  const list = [];
  
		  request.onsuccess = e => {
			const cursor = event.target.result;
  
			if(cursor) {
			  const { key, value } = cursor;
  
			  list.push({
				key,
				value
			  });
  
			  cursor.continue();
			} else {
			  resolve(list);
			}
		  };
  
		  request.onerror = e => {
			reject(e);
		  };
		});
	  });
	}
  
	backups(objectStore, fileName) {
	  this.readAll(objectStore).then(list => utils.download(list, fileName));
	}
  
	update(objectStore, searchIndex, data) {
	  return new Promise((resolve, reject) => {
		this.dbConnection.then(db => {
		  const request = db.transaction([objectStore], 'readwrite').objectStore(objectStore).put(data, searchIndex);
  
		  request.onsuccess = e => {
			resolve(e);
		  };
  
		  request.onerror = e => {
			reject(e);
		  };
		});
	  });
	}
  
	delete(objectStore, searchIndex) {
	  return new Promise((resolve, reject) => {
		this.dbConnection.then(db => {
		  const request = db.transaction([objectStore], 'readwrite').objectStore(objectStore).delete(searchIndex);
  
		  request.onsuccess = e => {
			resolve(e);
		  };
  
		  request.onerror = e => {
			reject(e);
		  };
		});
	  });
	}
  }

class UsomDB extends IndexedDBOperator {
    #usomListURL = 'https://www.usom.gov.tr/url-list.txt';
	
	static stores = {
        usomURLList: {
			name: 'usom-url-list',
			rows: []
		}
    }

    constructor() {
        super({
            version: 4,
            name: 'usom-url-database'
        });

		this.createObjectStore(UsomDB.stores.usomURLList.name);
		this.updateURLs();
    }

    #getUSOMList() {
        return fetch(this.#usomListURL)
        .then(list => list.text())
        .then(list => list.split('\n'))
        .catch(err => console.log('Failed to getList'));
    }

    #isListDiffrent(oldURLList = [], newURLList = []) {
        return JSON.stringify(oldURLList) !== JSON.stringify(newURLList);
    }

    updateURLs() {
        this.#getUSOMList().then((list) => {
			this.read(UsomDB.stores.usomURLList.name, 0).then((oldList) => {
				const isDiffrent = this.#isListDiffrent(oldList, list);

				if(isDiffrent) {
					this.update(UsomDB.stores.usomURLList.name, 0, list);
				}
			})
		})
		.catch(err => console.log('Failed to updateURLs'));
    }
}

(function() {
	const usomDB = new UsomDB();

	usomDB.read(UsomDB.stores.usomURLList.name, 0).then((list) => {
		list.forEach((domain, index) => {
			let id = index + 1;
			chrome.declarativeNetRequest.updateDynamicRules({
				addRules:[{
					'id': id,
					'priority': 1,
					'action': { 'type': 'block' },
					'condition': {'urlFilter': domain, 'resourceTypes': ['main_frame'] }
				}],
				removeRuleIds: [id]
			})
		});
	});	
})();
