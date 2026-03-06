import { HttpNode } from "./nodes/http.node";

export class NodeFactory {
  static createNode(type: string) {
    switch (type.toUpperCase()) {
      case "HTTP":
        return new HttpNode()
      default:
        throw new Error(`Unsupported node type: ${type}`)
    }
  }
}