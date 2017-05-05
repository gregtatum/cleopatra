import 'babel-polyfill';
import { SymbolStore } from '../../content/symbol-store';
import { TextDecoder } from 'text-encoding';
import exampleSymbolTable from '../fixtures/example-symbol-table';
import fakeIndexedDB from 'fake-indexeddb';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

describe('SymbolStore', function () {
  global.window = { indexedDB: fakeIndexedDB, IDBKeyRange: FDBKeyRange };
  global.TextDecoder = TextDecoder;

  let requestCount = 0;
  const symbolProvider = {
    requestSymbolTable: () => {
      requestCount++;
      return Promise.resolve(exampleSymbolTable);
    },
  };

  const symbolStore = new SymbolStore('perf-html-async-storage', symbolProvider);

  it('should only request symbols from the symbol provider once per library', async function () {
    expect(requestCount).toEqual(0);

    const lib1 = { debugName: 'firefox', breakpadId: 'dont-care' };
    const addrsForLib1 = await symbolStore.getFuncAddressTableForLib(lib1);
    expect(requestCount).toEqual(1);
    expect(Array.from(addrsForLib1)).toEqual([0, 0xf00, 0x1a00, 0x2000]);
    const secondAndThirdSymbol = await symbolStore.getSymbolsForAddressesInLib([1, 2], lib1);
    expect(requestCount).toEqual(1);
    expect(secondAndThirdSymbol).toEqual(['second symbol', 'third symbol']);

    const lib2 = { debugName: 'firefox2', breakpadId: 'dont-care2' };
    const addrsForLib2 = await symbolStore.getFuncAddressTableForLib(lib2);
    expect(requestCount).toEqual(2);
    expect(Array.from(addrsForLib2)).toEqual([0, 0xf00, 0x1a00, 0x2000]);
    const firstAndLastSymbol = await symbolStore.getSymbolsForAddressesInLib([0, 3], lib2);
    expect(requestCount).toEqual(2);
    expect(firstAndLastSymbol).toEqual(['first symbol', 'last symbol']);

    const addrsForLib1AfterTheSecondTime = await symbolStore.getFuncAddressTableForLib(lib1);
    expect(requestCount).toEqual(2);
    expect(addrsForLib1).toEqual(addrsForLib1AfterTheSecondTime);
  });
});
