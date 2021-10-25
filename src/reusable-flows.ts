/**** some basic type definitions for safety (or for illustration) ****/

  type NR_Node      = any
  type NR_Workspace = any
  type NR_Id        = string
  type NR_Config    = any
  type NR_Msg = {
    topic?:string, payload:any, script?:string,
    _reusableFlows:{ Mode?:'return', Index?:number, Stack:number[] }
  }
  type NR_send   = (msg:NR_Msg | NR_Msg[] | NR_Msg[][] | null) => void
  type NR_done   = (err?:any) => void

/**** actual node definition ****/

  export default function (RED:any):void {
    let NodeSet:{ [Id:string]:NR_Node }        // will be filled at flow startup

    let InvocationCounter:number                    = 0
    let InvocationMapper:{ [Index:number]:NR_Node } = Object.create(null)

  /**** resuable-in ****/

    function ReusableIn (this:any, config:NR_Config):void {
      RED.nodes.createNode(this,config)

      let thisNode:NR_Node = this
        thisNode.name  = config.name
        thisNode.scope = config.scope

        thisNode._mayBeUsed   = false                   // set during validation
        thisNode._DesignError = undefined
      thisNode.on('input', function (msg:NR_Msg, send?:NR_send, done?:NR_done) {
        if (! thisNode._mayBeUsed) {
          return (done == null ? thisNode.error : done)(
            'reusable-in: must not be used due to pending errors'
          )
        }

        send = send || function () { thisNode.send.apply(thisNode,arguments) }

        send(msg)
        if (done) { done() }
      })

    /**** handle invocations ****/

      const InvocationEvent = 'reusable:' + config.id

      function InvocationEventListener (msg:any):void {
        thisNode.receive(msg)
      }

      RED.events.on(InvocationEvent,InvocationEventListener)

    /**** handle "tweak" events ****/

      const TweakEvent = 'tweak-' + config.id

      function TweakListener (Tweak:any[]):void {
        let [ Key,Value ] = Tweak
        thisNode[Key] = Value

        if (Key === '_DesignError') {
          if (Value == null) {
            thisNode.status({})
          } else {
            thisNode._mayBeUsed = false
            thisNode.status({ fill:'red', shape:'dot', text:Value })
          }
        }
      }

      RED.events.on(TweakEvent,TweakListener)

    /**** clean up on close ****/

      thisNode.on('close', () => {
        RED.events.removeListener(InvocationEvent,InvocationEventListener)
        RED.events.removeListener(TweakEvent,TweakListener)
      })
    }

    RED.nodes.registerType('reusable-in', ReusableIn)

  /**** resuable-out ****/

    function ReusableOut (this:any, config:NR_Config):void {
      RED.nodes.createNode(this,config)

      let thisNode:NR_Node = this
        thisNode.position = config.position

        thisNode._Index       = undefined
        thisNode._mayBeUsed   = false     // set during "reusable-in" validation
        thisNode._DesignError = undefined
      thisNode.on('input', function (msg:NR_Msg, send?:NR_send, done?:NR_done) {
        if (! thisNode._mayBeUsed) {
          return (done == null ? thisNode.error : done)(
            'reusable-out: must not be used due to pending errors'
          )
        }

        try {
          let Internals = msg._reusableFlows

          let InvocationIndex = Internals.Stack.pop()
          if (InvocationIndex == null) {
            throw 'reusable-out: no invocation to return to found'
          }

          let callingNodeId = InvocationMapper[InvocationIndex]
            delete InvocationMapper[InvocationIndex] // don't reuse this return!
          if (typeof callingNodeId !== 'string') {
            throw 'reusable-out: broken invocation ' +
              '(did you try to return several times from the same invocation?)'
          }

          let callingNode = NodeSet[callingNodeId]
          if (callingNode == null) {
            throw 'reusable-out: no "reusable" node to return to found'
          } else {
            Internals.Mode  = 'return'
            Internals.Index = thisNode._Index
            RED.events.emit('reusable:' + callingNodeId, msg)
            if (done) { done() }
          }
        } catch (Signal) {
          return (done == null ? thisNode.error : done)(
            typeof Signal === 'string'
            ? Signal
            : 'reusable-out: broken "msg" (broken or missing internals)'
          )
        }
      })

    /**** handle "tweak" events ****/

      const TweakEvent = 'tweak-' + config.id

      function TweakListener (Tweak:any[]):void {
        let [ Key,Value ] = Tweak
        thisNode[Key] = Value

        if (Key === '_DesignError') {
          if (Value == null) {
            thisNode.status({})
          } else {
            thisNode._mayBeUsed = false
            thisNode.status({ fill:'red', shape:'dot', text:Value })
          }
        }
      }

      RED.events.on(TweakEvent,TweakListener)

    /**** clean up on close ****/

      thisNode.on('close', () => {
        RED.events.removeListener(TweakEvent,TweakListener)
      })
    }

    RED.nodes.registerType('reusable-out', ReusableOut)

  /**** reusable - the calling node ****/

    function Reusable (this:any, config:NR_Config):void {
      RED.nodes.createNode(this,config)

    /**** handle calls to the associated flow ****/

      const thisNode:NR_Node = this
        thisNode.target  = config.target
        thisNode.outputs = config.outputs

        thisNode._TargetNode  = undefined
        thisNode._mayBeUsed   = false                   // set during validation
        thisNode._DesignError = undefined
      thisNode.on('input', function (msg:NR_Msg, send?:NR_send, done?:NR_done) {
        if (! thisNode._mayBeUsed) {
          return (done == null ? thisNode.error : done)(
            'reusable: must not be used due to pending errors'
          )
        }

        send = send || function () { thisNode.send.apply(thisNode,arguments) }

        let Internals = msg._reusableFlows
        if (Internals == null) {
          Internals = msg._reusableFlows = { Stack:[] }
        }

        switch (Internals.Mode) {
          case undefined:                                              // 'call'
            InvocationCounter += 1
            InvocationMapper[InvocationCounter] = config.id

            Internals.Stack.push(InvocationCounter)
            RED.events.emit('reusable:' + thisNode._TargetNode.id, msg)
            break
          case 'return':                                             // 'return'
            let Index = Internals.Index
            delete Internals.Mode; delete Internals.Index

            switch (true) {
              case (thisNode.outputs === 1):
                send(msg)
                break
              case (Index === 0):
                send([msg])
                break
              case (typeof Index !== 'number'):
// @ts-ignore "Index" is now known to be a number
              case (Math.round(Index) !== Index): // also handles NaN
// @ts-ignore "Index" is now known to be an integer
              case (Index < 0):
// @ts-ignore "Index" is still known to be an integer
              case (Index >= thisNode.outputs):
                return (done == null ? thisNode.error : done)(
                  'reusable: broken "msg" (invalid "Index")'
                )
              default:
                let MsgList = new Array(thisNode.outputs)
// @ts-ignore "Index" is known to be an integer
                  MsgList[Index] = msg
                send(MsgList)
            }
            if (done) { done() }
            break
          default:                                                 // broken msg
            return (done == null ? thisNode.error : done)(
              'reusable: broken "msg" (missing "Mode")'
            )
        }
      })

    /**** handle returns from the called flow ****/

      const ReturnEvent = 'reusable:' + config.id

      function ReturnEventListener (msg:any):void {
        thisNode.receive(msg)
      }

      RED.events.on(ReturnEvent,ReturnEventListener)

    /**** handle "tweak" events ****/

      const TweakEvent = 'tweak-' + config.id

      function TweakListener (Tweak:any[]):void {
        let [ Key,Value ] = Tweak
        thisNode[Key] = Value

        if (Key === '_DesignError') {
          if (Value == null) {
            thisNode.status({})
          } else {
            thisNode._mayBeUsed = false
            thisNode.status({ fill:'red', shape:'dot', text:Value })
          }
        }
      }

      RED.events.on(TweakEvent,TweakListener)

    /**** clean up on close ****/

      thisNode.on('close', () => {
        RED.events.removeListener(ReturnEvent,ReturnEventListener)
        RED.events.removeListener(TweakEvent,TweakListener)
      })
    }

    RED.nodes.registerType('reusable', Reusable)

  /**** validateReusableFlows ****/

    function validateReusableFlows () {
      NodeSet = Object.create(null)      // collect all nodes for a quick lookup
      RED.nodes.eachNode((Node:NR_Node) => {
        NodeSet[Node.id] = Node
      })

      let UpstreamWiresOfNode = Object.create(null)    // to find upstream nodes
      RED.nodes.eachNode((Node:NR_Node) => {
        let DownstreamWires = (Node.wires || []).flat()
        DownstreamWires.forEach((DownstreamNodeId:NR_Id) => {
          if (DownstreamNodeId in UpstreamWiresOfNode) {
            UpstreamWiresOfNode[DownstreamNodeId].push(Node.id)
          } else {
            UpstreamWiresOfNode[DownstreamNodeId] = [Node.id]
          }
        })
      })

    /**** tweak ****/

      function tweak (Node:NR_Node, Key:string, Value:any):void {
        Node[Key] = Value
        if ((Key === '_DesignError') && (Value != null)) {
          Node._mayBeUsed = false
        }

        RED.events.emit('tweak-' + Node.id, [Key,Value])
      }

    /**** setDesignErrorOfNode ****/

      function setDesignErrorOfNode (Node:NR_Node, DesignError:string):void {
        tweak(Node, '_DesignError',DesignError)
      }

    /**** clearDesignErrorOfNode ****/

      function clearDesignErrorOfNode (Node:NR_Node):void {
        tweak(Node, '_DesignError',undefined)
      }

  /**** allUpstreamNodesOf - still to be implemented ****/

    function allUpstreamNodesOf (Node:NR_Node):NR_Node[] {
      let connectedNodeSet = Object.create(null)
        connectedNodeSet[Node.id] = Node

        function registerUpstreamNodesOf (Node:NR_Node):void {
          let UpstreamWires = UpstreamWiresOfNode[Node.id] || []
          UpstreamWires.forEach((connectedNodeId:NR_Id) => {
            if (! (connectedNodeId in connectedNodeSet)) {
              let connectedNode = NodeSet[connectedNodeId]
              connectedNodeSet[connectedNodeId] = connectedNode
              registerUpstreamNodesOf(connectedNode)
            }
          })
        }
        registerUpstreamNodesOf(Node)
      let Result = []
        delete connectedNodeSet[Node.id]
        for (let NodeId in connectedNodeSet) {
          Result.push(connectedNodeSet[NodeId])
        }
      return Result
    }

  /**** allDownstreamNodesOf ****/

    function allDownstreamNodesOf (Node:NR_Node):NR_Node[] {
      let connectedNodeSet = Object.create(null)
        connectedNodeSet[Node.id] = Node

        function registerDownstreamNodesOf (Node:NR_Node):void {
          let DownstreamWires = Node.wires.flat()
          DownstreamWires.forEach((connectedNodeId:NR_Id) => {
            if (! (connectedNodeId in connectedNodeSet)) {
              let connectedNode = NodeSet[connectedNodeId]
              connectedNodeSet[connectedNodeId] = connectedNode
              registerDownstreamNodesOf(connectedNode)
            }
          })
        }
        registerDownstreamNodesOf(Node)
      let Result = []
        delete connectedNodeSet[Node.id]
        for (let NodeId in connectedNodeSet) {
          Result.push(connectedNodeSet[NodeId])
        }
      return Result
    }

    /**** existingOutNodes ****/

      function existingOutNodes ():NR_Node[] {
        let Result:NR_Node[] = []
          RED.nodes.eachNode((Node:NR_Node) => {
            if (Node.type === 'reusable-out') { Result.push(Node) }
          })
        return Result
      }

    /**** validateAllReusableOutNodes ****/

      function validateAllReusableOutNodes () {
        let OutNodes:NR_Node[] = existingOutNodes()
        OutNodes.forEach((OutNode) => {
          if (WorkspaceWithId[OutNode.z] == null) return setDesignErrorOfNode(
            OutNode, 'do not end reusable flows within subflows'
          )

          let wiredInNodes = allUpstreamNodesOf(OutNode).filter(
            (Node:NR_Node) => (Node.type === 'reusable-in')
          )
          if (wiredInNodes.length === 0) return setDesignErrorOfNode(
            OutNode, 'no connected "reusable-in" node'
          )

          if (wiredInNodes.length > 1) return setDesignErrorOfNode(
            OutNode, 'multiple connected "reusable-in" nodes'
          )

          let Index = parseInt(OutNode.position,10) - 1               // 0-based
          if (isNaN(Index)) {
            return setDesignErrorOfNode(OutNode,'invalid "position"')
          } else {
            tweak(OutNode, '_Index',Index)
          }

          tweak(OutNode, '_mayBeUsed',true)
          clearDesignErrorOfNode(OutNode)        // may be changed later, though
        })
      }

    /**** existingInNodes ****/

      function existingInNodes ():NR_Node[] {
        let Result:NR_Node[] = []
          RED.nodes.eachNode((Node:NR_Node) => {
            if (Node.type === 'reusable-in') { Result.push(Node) }
          })
        return Result
      }

    /**** InNodesWithNameInWorkspace ****/

      function InNodesWithNameInWorkspace (
        Name:string, Workspace:NR_Workspace
      ):NR_Node[] {
        Name = Name.toLowerCase()

        let Result:NR_Node[] = []
          RED.nodes.eachNode((Node:NR_Node) => {
            if (
              (Node.type === 'reusable-in')           &&
              (WorkspaceWithId[Node.z] === Workspace) &&
              ((Node.name || '').trim().toLowerCase() === Name)
            ) { Result.push(Node) }
          })
        return Result
      }

    /**** validateAllReusableInNodes ****/

      function validateAllReusableInNodes () {
        let InNodes:NR_Node[] = existingInNodes()
        InNodes.forEach((InNode:NR_Node) => {
          if (WorkspaceWithId[InNode.z] == null) return setDesignErrorOfNode(
            InNode, 'do not begin reusable flows within subflows'
          )

          let NodeName = (InNode.name || '').trim().toLowerCase()
          if (NodeName === '') return setDesignErrorOfNode(
            InNode, 'no flow name given'
          )

          let InNodesWithThisName = InNodesWithNameInWorkspace(NodeName,WorkspaceWithId[InNode.z])
          if (InNodesWithThisName.length > 1) return setDesignErrorOfNode(
            InNode, 'multiple "reusable-in" nodes with this name'
          )

          let wiredOutNodes = allDownstreamNodesOf(InNode).filter(
            (Node:NR_Node) => (Node.type === 'reusable-out')
          )  // don't worry about OutNodes with multiple connected InNodes right now
          if (wiredOutNodes.length === 0) return setDesignErrorOfNode(
            InNode, 'no connected "reusable-out" node'
          )

          clearDesignErrorOfNode(InNode)

        /**** determine number of outputs ****/

          if (wiredOutNodes.length === 1) {
            let OutNode = wiredOutNodes[0]

            let Index = OutNode._Index
            if (Index >= 1) {
              setDesignErrorOfNode(OutNode, 'invalid output position')
            }

            tweak(InNode,'outputs',1)
          } else {
            let OutLabelSet = Object.create(null)

            let sortedOutNodes = new Array(wiredOutNodes.length)
              wiredOutNodes.forEach((OutNode:NR_Node) => {
                let Index = OutNode._Index
                if (Index >= wiredOutNodes.length) {
                  return setDesignErrorOfNode(OutNode, 'invalid output position')
                }

                if (sortedOutNodes[Index] == null) { // detect position collisions
                  sortedOutNodes[Index] = OutNode
                } else {
                  setDesignErrorOfNode(sortedOutNodes[Index], 'multiply used output position')
                  setDesignErrorOfNode(OutNode,               'multiply used output position')
                  return
                }

                let OutLabel = (OutNode.name || '').trim().toLowerCase()
                if (OutLabel !== '') {                // detect label collisions
                  if (OutLabelSet[OutLabel] == null) {
                    OutLabelSet[OutLabel] = OutNode
                  } else {
                    setDesignErrorOfNode(sortedOutNodes[Index], 'multiply used output label')
                    setDesignErrorOfNode(OutNode,               'multiply used output label')
                    return
                  }
                }
              })
            tweak(InNode,'outputs',sortedOutNodes.length)
          }

        /**** determine node usability ****/

          wiredOutNodes.forEach(
            (OutNode:NR_Node) => tweak(OutNode, '_mayBeUsed', OutNode._DesignError == null)
          )

          tweak(InNode, '_mayBeUsed',(InNode._DesignError == null) && wiredOutNodes.reduce(
            (Result:boolean,OutNode:NR_Node) => (Result && OutNode._mayBeUsed), true
          ))

          if (InNode._mayBeUsed) {
            clearDesignErrorOfNode(InNode)
          } else {
            if (InNode._DesignError == null) {
              setDesignErrorOfNode(InNode, 'error in "reusable-out" node')
            }
          }
        })
      }

    /**** existingUseNodes ****/

      function existingUseNodes ():NR_Node[] {
        let Result:NR_Node[] = []
          RED.nodes.eachNode((Node:NR_Node) => {
            if (Node.type === 'reusable') { Result.push(Node) }
          })
        return Result
      }

    /**** WorkspacesWithLabel ****/

      function WorkspacesWithLabel (Label:string):NR_Workspace[] {
        Label = Label.trim().toLowerCase()

        let Result:NR_Workspace[] = []
          Workspaces.forEach((Workspace:NR_Workspace) => {
            if (Workspace.label.trim().toLowerCase() === Label) {
              Result.push(Workspace)
            }
          })
        return Result
      }

    /**** validateAllReusableNodes ****/

      function validateAllReusableNodes () {
        let UseNodes:NR_Node[] = existingUseNodes()
        UseNodes.forEach((UseNode:NR_Node) => {
          if (WorkspaceWithId[UseNode.z] == null) return setDesignErrorOfNode(
            UseNode, 'do not invoke reusable flows from within subflows'
          )

          let TargetSpec = (UseNode.target || '').trim().toLowerCase()
          if (TargetSpec === '') return setDesignErrorOfNode(
            UseNode, 'missing target specification'
          )

          let WorkspaceLabel, InNodeName
          if (TargetSpec.indexOf(':') < 0) {
            WorkspaceLabel = ''; InNodeName = TargetSpec
          } else {
            WorkspaceLabel = TargetSpec.replace(/\s*:.*$/,'')
            InNodeName     = TargetSpec.replace(/^[^:]*:\s*/,'')
          }

          let Workspace = WorkspaceWithId[UseNode.z]
          if (WorkspaceLabel !== '') {
            let Workspaces = WorkspacesWithLabel(WorkspaceLabel)
            switch (Workspaces.length) {
              case 0:  return setDesignErrorOfNode(UseNode, 'no such target workspace')
              case 1:  Workspace = Workspaces[0]; break
              default: return setDesignErrorOfNode(UseNode, 'multiple target workspaces')
            }
          }

          if (InNodeName === '') return setDesignErrorOfNode(
            UseNode, 'missing target flow name'
          )

          let InNodes = InNodesWithNameInWorkspace(InNodeName,Workspace).filter(
            (InNode) => (InNode.scope === 'global') || (InNode.z === UseNode.z)
          )

          switch (InNodes.length) {
            case 0:  return setDesignErrorOfNode(UseNode, 'no such target flow')
            case 1:  tweak(UseNode, '_TargetNode',InNodes[0]); break
            default: return setDesignErrorOfNode(UseNode, 'multiple target flows')
          }

          tweak(UseNode,'_mayBeUsed',UseNode._TargetNode._mayBeUsed)
          if (UseNode._mayBeUsed) {
            clearDesignErrorOfNode(UseNode)
          } else {
            setDesignErrorOfNode(UseNode, 'error in target flow')
          }
        })
      }

    /**** collect workspaces ****/

      let Workspaces:NR_Workspace = []
      let WorkspaceWithId         = Object.create(null)
      RED.nodes.eachNode((Node:NR_Node) => {
        if (Node.type === 'tab') {
          WorkspaceWithId[Node.id] = Node
          Workspaces.push(Node)
        }
      })

      try {
        validateAllReusableOutNodes()
        validateAllReusableInNodes()
        validateAllReusableNodes()
      } catch (Signal) {     // Node-RED swallows exceptions and breaks silently
        console.error(Signal)
      }
    }

    RED.events.on('flows:started', validateReusableFlows)
  }
