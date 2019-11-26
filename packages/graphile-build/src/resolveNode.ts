import { Build, Context } from "./SchemaBuilder";
import { GetDataFromParsedResolveInfoFragmentFunction } from "./makeNewBuild";
import { GraphQLResolveInfo } from "graphql";
import { ResolveTree } from "graphql-parse-resolve-info";
import { NodeFetcher } from "./plugins/NodePlugin";

export default async function resolveNode<T = unknown>(
  nodeId: string,
  build: Build,
  {
    getDataFromParsedResolveInfoFragment,
  }: {
    getDataFromParsedResolveInfoFragment: GetDataFromParsedResolveInfoFragmentFunction;
  },
  data: unknown,
  context: Context,
  resolveInfo: GraphQLResolveInfo
): Promise<T | null> {
  const {
    $$isQuery,
    $$nodeType,
    parseResolveInfo,
    nodeFetcherByTypeName,
    getTypeAndIdentifiersFromNodeId,
    graphql: { getNamedType },
  } = build;
  if (nodeId === "query") {
    return ($$isQuery as unknown) as T;
  }
  try {
    const { Type, identifiers } = getTypeAndIdentifiersFromNodeId(nodeId);
    if (!Type) {
      throw new Error("Type not found");
    }
    const resolver: NodeFetcher =
      nodeFetcherByTypeName[getNamedType(Type).name];
    const parsedResolveInfoFragment = parseResolveInfo(
      resolveInfo,
      {}
    ) as ResolveTree | null;
    if (parsedResolveInfoFragment == null) {
      throw new Error("Internal error during query planning");
    }
    const resolveData = getDataFromParsedResolveInfoFragment(
      parsedResolveInfoFragment,
      getNamedType(Type)
    );

    const node = await resolver(
      data,
      identifiers,
      context,
      parsedResolveInfoFragment,
      resolveInfo.returnType,
      resolveData,
      resolveInfo
    );

    Object.defineProperty(node, $$nodeType, {
      enumerable: false,
      configurable: false,
      value: Type,
    });

    return (node as unknown) as T;
  } catch (e) {
    return null;
  }
}
