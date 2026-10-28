export type KovaaLab CRMRecord<TObjectUniversalIdentifier extends string = string> =
  string & { readonly __object?: TObjectUniversalIdentifier };
