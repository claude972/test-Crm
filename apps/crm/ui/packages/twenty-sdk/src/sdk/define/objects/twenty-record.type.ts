export type KovaaLabCRMRecord<TObjectUniversalIdentifier extends string = string> =
  string & { readonly __object?: TObjectUniversalIdentifier };
