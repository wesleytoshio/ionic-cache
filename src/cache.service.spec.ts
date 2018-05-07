import 'core-js';
import 'zone.js/dist/zone';
import 'zone.js/dist/long-stack-trace-zone';
import 'zone.js/dist/proxy';
import 'zone.js/dist/sync-test';
import 'zone.js/dist/jasmine-patch';
import 'zone.js/dist/async-test';
import 'zone.js/dist/fake-async-test';
import { CacheService, MESSAGES } from './cache.service';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { Observable } from 'rxjs/Observable';
import { Storage } from '@ionic/storage';

import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { count } from 'rxjs/operators/count';

TestBed.initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting()
);

describe('CacheService', () => {
  let service: CacheService;
  const ttl = 0.4;
  const key = 'https://github.com/Nodonisko/ionic-cache';
  const factoryKey = 'anotherKey';
  const groupKey = 'fooGroup';
  const cacheValue = 'ibby';
  const cacheFactoryValue = 100;

  beforeAll(function(done) {
    service = new CacheService(
      new Storage({
        name: '__ionicCache',
        driverOrder: ['indexeddb', 'sqlite', 'websql']
      })
    );
    service.ready().then(done);
  });

  it('should create an instance of the service', () =>
    expect(service).toBeDefined());

  it('should save item to storage (async)', done => {
    service
      .saveItem(key, cacheValue, groupKey, ttl)
      .then(() => {
        expect(true).toBeTruthy();
        done();
      })
      .catch(e => {
        expect(e).toBeUndefined();
        done();
      });
  });

  it('should get previously stored value (async)', done => {
    service
      .getItem(key)
      .then(value => {
        expect(value).toEqual(cacheValue);
        done();
      })
      .catch(e => {
        expect(e).toBeUndefined();
        done();
      });
  });

  it('previously stored value should exist in cache (async)', done => {
    service
      .itemExists(key)
      .then(value => {
        expect(value).toBeTruthy();
        done();
      })
      .catch(e => {
        expect(e).toBeUndefined();
        done();
      });
  });

  it('should save item generated by value factory to storage (async)', done => {
    service
      .getOrSetItem(factoryKey, () => Promise.resolve(10 * 10))
      .then(() => {
        service.getItem(factoryKey).then(value => {
          expect(value).toEqual(cacheFactoryValue);
          done();
        });
      })
      .catch(e => {
        expect(e).toBeUndefined();
        done();
      });
  });

  it('should not execute value factory when key is in the cache (async)', done => {
    let executed = false;

    service
      .getOrSetItem(factoryKey, () => {
        executed = true;
        return Promise.resolve(20 * 20);
      })
      .then(() => {
        service.getItem(factoryKey).then(value => {
          expect(value).toEqual(cacheFactoryValue);
          expect(executed).toBe(false);
          done();
        });
      })
      .catch(e => {
        expect(e).toBeUndefined();
        done();
      });
  });

  it('should throw error because cache expired (async)', done => {
    setTimeout(() => {
      service
        .getItem(key)
        .then(value => {
          expect(false).toBeTruthy();
          done();
        })
        .catch(e => {
          expect(e).not.toBeUndefined();
          done();
        });
    }, ttl * 1000 + 1);
  });

  it('previously stored value should exist in cache even when value is expired (async)', done => {
    service
      .itemExists(key)
      .then(value => {
        expect(value).toBeTruthy();
        done();
      })
      .catch(e => {
        expect(e).toBeUndefined();
        done();
      });
  });

  it('should disable cache', () => {
    service.enableCache(false);
    expect((<any>service).cacheEnabled === false).toBeTruthy();
  });

  it('itemExist should reject because cache is disabled (async)', done => {
    service
      .itemExists(key)
      .then(value => {
        expect(value).toBeUndefined();
        done();
      })
      .catch(e => {
        expect(e).toEqual(MESSAGES[1]);
        done();
      });
  });

  it('should throw an error when getting item and cache is disabled', done => {
    expect((<any>service).cacheEnabled === false).toBeTruthy();
    return service
      .getItem(key)
      .then(res => {
        expect(res).toBeUndefined();
        done();
      })
      .catch(e => {
        expect(e).toEqual(MESSAGES[1]);
        done();
      });
  });

  it('should enable cache', () => {
    service.enableCache(true);
    expect((<any>service).cacheEnabled === true).toBeTruthy();
  });

  it('itemExists should return false if item not exists', done => {
    return service
      .clearAll()
      .then(() =>
        service.itemExists(key).then(res => {
          expect(res).toBeFalsy();
          done();
        })
      )
      .catch(e => {
        expect(e).toBeUndefined();
        done();
      });
  });

  afterAll(function(done) {
    console.info('Clearing cache');
    service
      .clearAll()
      .then(done)
      .catch(done);
  });
});

describe('Observable Caching', () => {
  const key: string = 'http_cache_test';

  let mockData: any = {
    hello: 'Hello world"s ',
    world: "It's beautiful day" // tslint:disable-line
  };

  let observable = of(mockData);

  let service: CacheService;

  beforeAll(done => {
    service = new CacheService(
      new Storage({
        name: '__ionicCache',
        driverOrder: ['indexeddb', 'sqlite', 'websql']
      })
    );
    service.ready().then(done);
  });

  beforeEach(() => {
    spyOn(observable, 'subscribe').and.callThrough();
  });

  it('should create an instance of the service', () => {
    expect(service).toBeDefined();
  });

  it('should return data from observable (async)', (done: any) => {
    service.loadFromObservable(key, observable).subscribe(
      res => {
        expect(res).toBeDefined();
        expect(observable.subscribe).toHaveBeenCalled();
        expect(res).toEqual(mockData);
        done();
      },
      err => {
        console.info('Error in observable', err);
        done(err);
      }
    );
  });

  it('should return cached observable data (async)', done => {
    service.loadFromObservable(key, observable).subscribe(res => {
      expect(observable.subscribe).not.toHaveBeenCalled();
      expect(res).toEqual(mockData);
      done();
    });
  });

  afterAll(done => {
    service
      .clearAll()
      .then(done)
      .catch(done);
  });
});

describe('Observable caching errors', () => {
  const key: string = 'http_cache_error_test';

  let mockData: any = {
    hello: 'Hello world"s ',
    world: "It's beautiful day" // tslint:disable-line
  };

  let observableError = Observable.throw(mockData);

  let service: CacheService;

  beforeAll(done => {
    service = new CacheService(
      new Storage({
        name: '__ionicCache',
        driverOrder: ['indexeddb', 'sqlite', 'websql']
      })
    );
    service.ready().then(done);
  });

  beforeEach(() => {
    spyOn(observableError, 'subscribe').and.callThrough();
  });

  it('should create an instance of the service', () => {
    expect(service).toBeDefined();
  });

  it('should return data from observable (async)', (done: any) => {
    service.loadFromObservable(key, observableError).subscribe(
      res => {
        expect(true).toBeFalsy();
        done();
      },
      err => {
        expect(err).toBeDefined();
        done(err);
      }
    );
  });

  afterAll(done => {
    service
      .clearAll()
      .then(done)
      .catch(done);
  });
});

describe('Delayed observable caching', () => {
  const ttl = 1;
  const key = 'https://github.com/Nodonisko/ionic-cache';
  const groupKey = 'fooGroup';
  const mockData: any = {
    hello: 'Hello world'
  };
  const mockData2: any = {
    hello: 'Hello world again'
  };

  const observable = of(mockData);
  const observable2 = of(mockData2);

  let service: CacheService;

  beforeAll(done => {
    service = new CacheService(
      new Storage({
        name: '__ionicCache',
        driverOrder: ['indexeddb', 'sqlite', 'websql']
      })
    );
    service.ready().then(done);
  });

  beforeEach(() => {
    spyOn(observable, 'subscribe').and.callThrough();
    spyOn(observable2, 'subscribe').and.callThrough();
  });

  it('should create an instance of the service', () => {
    expect(service).toBeDefined();
  });

  it('should return data from observable (async)', (done: any) => {
    service.loadFromDelayedObservable(key, observable, groupKey, ttl).subscribe(
      res => {
        expect(res).toBeDefined();
        expect(observable.subscribe).toHaveBeenCalled();
        expect(res).toEqual(mockData);
        done();
      },
      err => {
        done(err);
      }
    );
  });

  it('should return cached observable data if is NOT expired (async)', done => {
    service
      .loadFromDelayedObservable(key, observable2, groupKey, ttl)
      .subscribe(res => {
        expect(observable2.subscribe).not.toHaveBeenCalled();
        expect(res).toEqual(mockData);
        done();
      });
  });

  it('should return 2 responses (cache, server) if is NOT exprired and delayType is all (async)', done => {
    service
      .loadFromDelayedObservable(key, observable2, groupKey, ttl, 'all')
      .pipe(count(() => true))
      .subscribe(
        count => {
          expect(observable2.subscribe).toHaveBeenCalled();
          expect(count).toEqual(2);
          done();
        },
        done,
        done
      );
  });

  it('should return 2 responses (cache, server) if is NOT exprired and delayType is all (async)', done => {
    service
      .loadFromDelayedObservable(key, observable2, groupKey, ttl, 'all')
      .subscribe(
        res => {
          expect(res).toEqual(mockData2);
          done();
        },
        done,
        done
      );
  });

  afterAll(done => {
    service
      .clearAll()
      .then(done)
      .catch(done);
  });
});

describe('Delayed observable caching error', () => {
  const ttl = 1;
  const key = 'https://github.com/Nodonisko/ionic-cache';
  const groupKey = 'fooGroup';
  const mockData: any = {
    hello: 'Hello world'
  };
  const mockData2: any = {
    hello: 'Hello world again'
  };

  const observable = of(mockData);
  const observable2 = of(mockData2);
  const observableError = _throw(mockData);

  let service: CacheService;

  beforeAll(done => {
    service = new CacheService(
      new Storage({
        name: '__ionicCache',
        driverOrder: ['indexeddb', 'sqlite', 'websql']
      })
    );
    service.ready().then(done);
  });

  beforeEach(() => {
    spyOn(observable, 'subscribe').and.callThrough();
    spyOn(observable2, 'subscribe').and.callThrough();
  });

  it('should create an instance of the service', () => {
    expect(service).toBeDefined();
  });

  it('should return error from observable (async)', (done: any) => {
    service
      .loadFromDelayedObservable(key, observableError, groupKey, ttl)
      .subscribe(
        res => {
          expect(true).toBeFalsy();
          done();
        },
        err => {
          expect(err).toBeDefined();
          expect(err).toEqual(mockData);
          done(err);
        },
        done
      );
  });

  it('should return data from observable (async)', (done: any) => {
    service.loadFromDelayedObservable(key, observable, groupKey, ttl).subscribe(
      res => {
        expect(res).toBeDefined();
        expect(observable.subscribe).toHaveBeenCalled();
        expect(res).toEqual(mockData);
        done();
      },
      err => {
        done(err);
      }
    );
  });

  it('should return one reponse and one error from observable (async)', (done: any) => {
    service
      .loadFromDelayedObservable(key, observableError, groupKey, ttl, 'all')
      .subscribe(
        res => {
          expect(res).toEqual(mockData);
        },
        err => {
          expect(err).toBeDefined();
          expect(err).toEqual(mockData);
          done(err);
        },
        done
      );
  });

  afterAll(done => {
    service
      .clearAll()
      .then(done)
      .catch(done);
  });
});
