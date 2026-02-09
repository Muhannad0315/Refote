import {
  CancelledError,
  InfiniteQueryObserver,
  Mutation,
  MutationCache,
  MutationObserver,
  QueriesObserver,
  Query,
  QueryCache,
  QueryClient,
  QueryObserver,
  defaultShouldDehydrateMutation,
  defaultShouldDehydrateQuery,
  dehydrate,
  focusManager,
  hashKey,
  hydrate,
  isCancelledError,
  isServer,
  keepPreviousData,
  matchMutation,
  matchQuery,
  notifyManager,
  onlineManager,
  replaceEqualDeep,
  skipToken
} from "./chunk-Q6QYTXGE.js";
import {
  require_jsx_runtime
} from "./chunk-EQFMSYMM.js";
import {
  require_react
} from "./chunk-NOXMZ2VL.js";
import {
  __toESM
} from "./chunk-5WRI5ZAA.js";

// node_modules/@tanstack/react-query/build/legacy/useQueries.js
var React5 = __toESM(require_react(), 1);

// node_modules/@tanstack/react-query/build/legacy/QueryClientProvider.js
var React = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var QueryClientContext = React.createContext(
  void 0
);
var useQueryClient = (queryClient) => {
  const client = React.useContext(QueryClientContext);
  if (queryClient) {
    return queryClient;
  }
  if (!client) {
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  }
  return client;
};
var QueryClientProvider = ({
  client,
  children
}) => {
  React.useEffect(() => {
    client.mount();
    return () => {
      client.unmount();
    };
  }, [client]);
  return (0, import_jsx_runtime.jsx)(QueryClientContext.Provider, { value: client, children });
};

// node_modules/@tanstack/react-query/build/legacy/isRestoring.js
var React2 = __toESM(require_react(), 1);
var IsRestoringContext = React2.createContext(false);
var useIsRestoring = () => React2.useContext(IsRestoringContext);
var IsRestoringProvider = IsRestoringContext.Provider;

// node_modules/@tanstack/react-query/build/legacy/QueryErrorResetBoundary.js
var React3 = __toESM(require_react(), 1);
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
function createValue() {
  let isReset = false;
  return {
    clearReset: () => {
      isReset = false;
    },
    reset: () => {
      isReset = true;
    },
    isReset: () => {
      return isReset;
    }
  };
}
var QueryErrorResetBoundaryContext = React3.createContext(createValue());
var useQueryErrorResetBoundary = () => React3.useContext(QueryErrorResetBoundaryContext);
var QueryErrorResetBoundary = ({
  children
}) => {
  const [value] = React3.useState(() => createValue());
  return (0, import_jsx_runtime2.jsx)(QueryErrorResetBoundaryContext.Provider, { value, children: typeof children === "function" ? children(value) : children });
};

// node_modules/@tanstack/react-query/build/legacy/errorBoundaryUtils.js
var React4 = __toESM(require_react(), 1);

// node_modules/@tanstack/react-query/build/legacy/utils.js
function shouldThrowError(throwError, params) {
  if (typeof throwError === "function") {
    return throwError(...params);
  }
  return !!throwError;
}
function noop() {
}

// node_modules/@tanstack/react-query/build/legacy/errorBoundaryUtils.js
var ensurePreventErrorBoundaryRetry = (options, errorResetBoundary) => {
  if (options.suspense || options.throwOnError || options.experimental_prefetchInRender) {
    if (!errorResetBoundary.isReset()) {
      options.retryOnMount = false;
    }
  }
};
var useClearResetErrorBoundary = (errorResetBoundary) => {
  React4.useEffect(() => {
    errorResetBoundary.clearReset();
  }, [errorResetBoundary]);
};
var getHasError = ({
  result,
  errorResetBoundary,
  throwOnError,
  query
}) => {
  return result.isError && !errorResetBoundary.isReset() && !result.isFetching && query && shouldThrowError(throwOnError, [result.error, query]);
};

// node_modules/@tanstack/react-query/build/legacy/suspense.js
var defaultThrowOnError = (_error, query) => query.state.data === void 0;
var ensureSuspenseTimers = (defaultedOptions) => {
  if (defaultedOptions.suspense) {
    if (defaultedOptions.staleTime === void 0) {
      defaultedOptions.staleTime = 1e3;
    }
    if (typeof defaultedOptions.gcTime === "number") {
      defaultedOptions.gcTime = Math.max(defaultedOptions.gcTime, 1e3);
    }
  }
};
var willFetch = (result, isRestoring) => result.isLoading && result.isFetching && !isRestoring;
var shouldSuspend = (defaultedOptions, result) => (defaultedOptions == null ? void 0 : defaultedOptions.suspense) && result.isPending;
var fetchOptimistic = (defaultedOptions, observer, errorResetBoundary) => observer.fetchOptimistic(defaultedOptions).catch(() => {
  errorResetBoundary.clearReset();
});

// node_modules/@tanstack/react-query/build/legacy/useQueries.js
function useQueries({
  queries,
  ...options
}, queryClient) {
  const client = useQueryClient(queryClient);
  const isRestoring = useIsRestoring();
  const errorResetBoundary = useQueryErrorResetBoundary();
  const defaultedQueries = React5.useMemo(
    () => queries.map((opts) => {
      const defaultedOptions = client.defaultQueryOptions(
        opts
      );
      defaultedOptions._optimisticResults = isRestoring ? "isRestoring" : "optimistic";
      return defaultedOptions;
    }),
    [queries, client, isRestoring]
  );
  defaultedQueries.forEach((query) => {
    ensureSuspenseTimers(query);
    ensurePreventErrorBoundaryRetry(query, errorResetBoundary);
  });
  useClearResetErrorBoundary(errorResetBoundary);
  const [observer] = React5.useState(
    () => new QueriesObserver(
      client,
      defaultedQueries,
      options
    )
  );
  const [optimisticResult, getCombinedResult, trackResult] = observer.getOptimisticResult(
    defaultedQueries,
    options.combine
  );
  React5.useSyncExternalStore(
    React5.useCallback(
      (onStoreChange) => isRestoring ? noop : observer.subscribe(notifyManager.batchCalls(onStoreChange)),
      [observer, isRestoring]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  React5.useEffect(() => {
    observer.setQueries(
      defaultedQueries,
      options,
      {
        listeners: false
      }
    );
  }, [defaultedQueries, options, observer]);
  const shouldAtLeastOneSuspend = optimisticResult.some(
    (result, index) => shouldSuspend(defaultedQueries[index], result)
  );
  const suspensePromises = shouldAtLeastOneSuspend ? optimisticResult.flatMap((result, index) => {
    const opts = defaultedQueries[index];
    if (opts) {
      const queryObserver = new QueryObserver(client, opts);
      if (shouldSuspend(opts, result)) {
        return fetchOptimistic(opts, queryObserver, errorResetBoundary);
      } else if (willFetch(result, isRestoring)) {
        void fetchOptimistic(opts, queryObserver, errorResetBoundary);
      }
    }
    return [];
  }) : [];
  if (suspensePromises.length > 0) {
    throw Promise.all(suspensePromises);
  }
  const firstSingleResultWhichShouldThrow = optimisticResult.find(
    (result, index) => {
      const query = defaultedQueries[index];
      return query && getHasError({
        result,
        errorResetBoundary,
        throwOnError: query.throwOnError,
        query: client.getQueryCache().get(query.queryHash)
      });
    }
  );
  if (firstSingleResultWhichShouldThrow == null ? void 0 : firstSingleResultWhichShouldThrow.error) {
    throw firstSingleResultWhichShouldThrow.error;
  }
  return getCombinedResult(trackResult());
}

// node_modules/@tanstack/react-query/build/legacy/useBaseQuery.js
var React6 = __toESM(require_react(), 1);
function useBaseQuery(options, Observer, queryClient) {
  var _a, _b, _c, _d, _e;
  if (true) {
    if (typeof options !== "object" || Array.isArray(options)) {
      throw new Error(
        'Bad argument type. Starting with v5, only the "Object" form is allowed when calling query related functions. Please use the error stack to find the culprit call. More info here: https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5#supports-a-single-signature-one-object'
      );
    }
  }
  const client = useQueryClient(queryClient);
  const isRestoring = useIsRestoring();
  const errorResetBoundary = useQueryErrorResetBoundary();
  const defaultedOptions = client.defaultQueryOptions(options);
  (_b = (_a = client.getDefaultOptions().queries) == null ? void 0 : _a._experimental_beforeQuery) == null ? void 0 : _b.call(
    _a,
    defaultedOptions
  );
  defaultedOptions._optimisticResults = isRestoring ? "isRestoring" : "optimistic";
  ensureSuspenseTimers(defaultedOptions);
  ensurePreventErrorBoundaryRetry(defaultedOptions, errorResetBoundary);
  useClearResetErrorBoundary(errorResetBoundary);
  const isNewCacheEntry = !client.getQueryCache().get(defaultedOptions.queryHash);
  const [observer] = React6.useState(
    () => new Observer(
      client,
      defaultedOptions
    )
  );
  const result = observer.getOptimisticResult(defaultedOptions);
  React6.useSyncExternalStore(
    React6.useCallback(
      (onStoreChange) => {
        const unsubscribe = isRestoring ? noop : observer.subscribe(notifyManager.batchCalls(onStoreChange));
        observer.updateResult();
        return unsubscribe;
      },
      [observer, isRestoring]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  React6.useEffect(() => {
    observer.setOptions(defaultedOptions, { listeners: false });
  }, [defaultedOptions, observer]);
  if (shouldSuspend(defaultedOptions, result)) {
    throw fetchOptimistic(defaultedOptions, observer, errorResetBoundary);
  }
  if (getHasError({
    result,
    errorResetBoundary,
    throwOnError: defaultedOptions.throwOnError,
    query: client.getQueryCache().get(defaultedOptions.queryHash)
  })) {
    throw result.error;
  }
  ;
  (_d = (_c = client.getDefaultOptions().queries) == null ? void 0 : _c._experimental_afterQuery) == null ? void 0 : _d.call(
    _c,
    defaultedOptions,
    result
  );
  if (defaultedOptions.experimental_prefetchInRender && !isServer && willFetch(result, isRestoring)) {
    const promise = isNewCacheEntry ? (
      // Fetch immediately on render in order to ensure `.promise` is resolved even if the component is unmounted
      fetchOptimistic(defaultedOptions, observer, errorResetBoundary)
    ) : (
      // subscribe to the "cache promise" so that we can finalize the currentThenable once data comes in
      (_e = client.getQueryCache().get(defaultedOptions.queryHash)) == null ? void 0 : _e.promise
    );
    promise == null ? void 0 : promise.catch(noop).finally(() => {
      observer.updateResult();
    });
  }
  return !defaultedOptions.notifyOnChangeProps ? observer.trackResult(result) : result;
}

// node_modules/@tanstack/react-query/build/legacy/useQuery.js
function useQuery(options, queryClient) {
  return useBaseQuery(options, QueryObserver, queryClient);
}

// node_modules/@tanstack/react-query/build/legacy/useSuspenseQuery.js
function useSuspenseQuery(options, queryClient) {
  if (true) {
    if (options.queryFn === skipToken) {
      console.error("skipToken is not allowed for useSuspenseQuery");
    }
  }
  return useBaseQuery(
    {
      ...options,
      enabled: true,
      suspense: true,
      throwOnError: defaultThrowOnError,
      placeholderData: void 0
    },
    QueryObserver,
    queryClient
  );
}

// node_modules/@tanstack/react-query/build/legacy/useSuspenseInfiniteQuery.js
function useSuspenseInfiniteQuery(options, queryClient) {
  if (true) {
    if (options.queryFn === skipToken) {
      console.error("skipToken is not allowed for useSuspenseInfiniteQuery");
    }
  }
  return useBaseQuery(
    {
      ...options,
      enabled: true,
      suspense: true,
      throwOnError: defaultThrowOnError
    },
    InfiniteQueryObserver,
    queryClient
  );
}

// node_modules/@tanstack/react-query/build/legacy/useSuspenseQueries.js
function useSuspenseQueries(options, queryClient) {
  return useQueries(
    {
      ...options,
      queries: options.queries.map((query) => {
        if (true) {
          if (query.queryFn === skipToken) {
            console.error("skipToken is not allowed for useSuspenseQueries");
          }
        }
        return {
          ...query,
          suspense: true,
          throwOnError: defaultThrowOnError,
          enabled: true,
          placeholderData: void 0
        };
      })
    },
    queryClient
  );
}

// node_modules/@tanstack/react-query/build/legacy/usePrefetchQuery.js
function usePrefetchQuery(options, queryClient) {
  const client = useQueryClient(queryClient);
  if (!client.getQueryState(options.queryKey)) {
    client.prefetchQuery(options);
  }
}

// node_modules/@tanstack/react-query/build/legacy/usePrefetchInfiniteQuery.js
function usePrefetchInfiniteQuery(options, queryClient) {
  const client = useQueryClient(queryClient);
  if (!client.getQueryState(options.queryKey)) {
    client.prefetchInfiniteQuery(options);
  }
}

// node_modules/@tanstack/react-query/build/legacy/queryOptions.js
function queryOptions(options) {
  return options;
}

// node_modules/@tanstack/react-query/build/legacy/infiniteQueryOptions.js
function infiniteQueryOptions(options) {
  return options;
}

// node_modules/@tanstack/react-query/build/legacy/HydrationBoundary.js
var React7 = __toESM(require_react(), 1);
var HydrationBoundary = ({
  children,
  options = {},
  state,
  queryClient
}) => {
  const client = useQueryClient(queryClient);
  const [hydrationQueue, setHydrationQueue] = React7.useState();
  const optionsRef = React7.useRef(options);
  optionsRef.current = options;
  React7.useMemo(() => {
    if (state) {
      if (typeof state !== "object") {
        return;
      }
      const queryCache = client.getQueryCache();
      const queries = state.queries || [];
      const newQueries = [];
      const existingQueries = [];
      for (const dehydratedQuery of queries) {
        const existingQuery = queryCache.get(dehydratedQuery.queryHash);
        if (!existingQuery) {
          newQueries.push(dehydratedQuery);
        } else {
          const hydrationIsNewer = dehydratedQuery.state.dataUpdatedAt > existingQuery.state.dataUpdatedAt;
          const queryAlreadyQueued = hydrationQueue == null ? void 0 : hydrationQueue.find(
            (query) => query.queryHash === dehydratedQuery.queryHash
          );
          if (hydrationIsNewer && (!queryAlreadyQueued || dehydratedQuery.state.dataUpdatedAt > queryAlreadyQueued.state.dataUpdatedAt)) {
            existingQueries.push(dehydratedQuery);
          }
        }
      }
      if (newQueries.length > 0) {
        hydrate(client, { queries: newQueries }, optionsRef.current);
      }
      if (existingQueries.length > 0) {
        setHydrationQueue(
          (prev) => prev ? [...prev, ...existingQueries] : existingQueries
        );
      }
    }
  }, [client, hydrationQueue, state]);
  React7.useEffect(() => {
    if (hydrationQueue) {
      hydrate(client, { queries: hydrationQueue }, optionsRef.current);
      setHydrationQueue(void 0);
    }
  }, [client, hydrationQueue]);
  return children;
};

// node_modules/@tanstack/react-query/build/legacy/useIsFetching.js
var React8 = __toESM(require_react(), 1);
function useIsFetching(filters, queryClient) {
  const client = useQueryClient(queryClient);
  const queryCache = client.getQueryCache();
  return React8.useSyncExternalStore(
    React8.useCallback(
      (onStoreChange) => queryCache.subscribe(notifyManager.batchCalls(onStoreChange)),
      [queryCache]
    ),
    () => client.isFetching(filters),
    () => client.isFetching(filters)
  );
}

// node_modules/@tanstack/react-query/build/legacy/useMutationState.js
var React9 = __toESM(require_react(), 1);
function useIsMutating(filters, queryClient) {
  const client = useQueryClient(queryClient);
  return useMutationState(
    { filters: { ...filters, status: "pending" } },
    client
  ).length;
}
function getResult(mutationCache, options) {
  return mutationCache.findAll(options.filters).map(
    (mutation) => options.select ? options.select(mutation) : mutation.state
  );
}
function useMutationState(options = {}, queryClient) {
  const mutationCache = useQueryClient(queryClient).getMutationCache();
  const optionsRef = React9.useRef(options);
  const result = React9.useRef(null);
  if (!result.current) {
    result.current = getResult(mutationCache, options);
  }
  React9.useEffect(() => {
    optionsRef.current = options;
  });
  return React9.useSyncExternalStore(
    React9.useCallback(
      (onStoreChange) => mutationCache.subscribe(() => {
        const nextResult = replaceEqualDeep(
          result.current,
          getResult(mutationCache, optionsRef.current)
        );
        if (result.current !== nextResult) {
          result.current = nextResult;
          notifyManager.schedule(onStoreChange);
        }
      }),
      [mutationCache]
    ),
    () => result.current,
    () => result.current
  );
}

// node_modules/@tanstack/react-query/build/legacy/useMutation.js
var React10 = __toESM(require_react(), 1);
function useMutation(options, queryClient) {
  const client = useQueryClient(queryClient);
  const [observer] = React10.useState(
    () => new MutationObserver(
      client,
      options
    )
  );
  React10.useEffect(() => {
    observer.setOptions(options);
  }, [observer, options]);
  const result = React10.useSyncExternalStore(
    React10.useCallback(
      (onStoreChange) => observer.subscribe(notifyManager.batchCalls(onStoreChange)),
      [observer]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  const mutate = React10.useCallback(
    (variables, mutateOptions) => {
      observer.mutate(variables, mutateOptions).catch(noop);
    },
    [observer]
  );
  if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) {
    throw result.error;
  }
  return { ...result, mutate, mutateAsync: result.mutate };
}

// node_modules/@tanstack/react-query/build/legacy/useInfiniteQuery.js
function useInfiniteQuery(options, queryClient) {
  return useBaseQuery(
    options,
    InfiniteQueryObserver,
    queryClient
  );
}
export {
  CancelledError,
  HydrationBoundary,
  InfiniteQueryObserver,
  IsRestoringProvider,
  Mutation,
  MutationCache,
  MutationObserver,
  QueriesObserver,
  Query,
  QueryCache,
  QueryClient,
  QueryClientContext,
  QueryClientProvider,
  QueryErrorResetBoundary,
  QueryObserver,
  defaultShouldDehydrateMutation,
  defaultShouldDehydrateQuery,
  dehydrate,
  focusManager,
  hashKey,
  hydrate,
  infiniteQueryOptions,
  isCancelledError,
  isServer,
  keepPreviousData,
  matchMutation,
  matchQuery,
  notifyManager,
  onlineManager,
  queryOptions,
  replaceEqualDeep,
  skipToken,
  useInfiniteQuery,
  useIsFetching,
  useIsMutating,
  useIsRestoring,
  useMutation,
  useMutationState,
  usePrefetchInfiniteQuery,
  usePrefetchQuery,
  useQueries,
  useQuery,
  useQueryClient,
  useQueryErrorResetBoundary,
  useSuspenseInfiniteQuery,
  useSuspenseQueries,
  useSuspenseQuery
};
//# sourceMappingURL=@tanstack_react-query.js.map
