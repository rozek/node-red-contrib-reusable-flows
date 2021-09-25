# node-red-contrib-reusable-flows #

`node-red-contrib-reusable-flows` provides nodes that represent complete flows.

The desire for such a package arose from the need to be able to reuse existing flows without having to copy them and without having to spend a separate editor tab for each such flow.

The current goal is to have an alternative to "function" nodes which is backed by flows rather than JavaScript - although the "wiring compatibility" would allow to replace "reusable flow" nodes by (probably more efficient) "function" nodes should that become necessary.

Three types of nodes are involved:

* `reusable-in` - starts a new "reusable flow"
* `reusable-out` - ends a "reusable flow" (multiple `reusable-out` nodes are allowed for any `reusable-in`)
* `reusable` - effectively "invokes" a reusable flow (i.e., the incoming `msg` is passed to the associated `reusable-in` and the `msg` read by the first connected `reusable-out` passed to the appropriate output of this `reusable` node)

### Alternatives ###

Node-RED


> Nota bene: this work is currently in progress. Please don't expect it to be finished before end of September 2021

## License ##

[MIT License](LICENSE.md)
