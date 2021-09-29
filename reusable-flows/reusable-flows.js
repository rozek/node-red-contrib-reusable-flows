"use strict";module.exports=function(e){e.nodes.registerType("reusable-in",(function(n){e.nodes.createNode(this,n);var r=this;r.name=n.name,r.scope=n.scope,r._mayBeUsed=!1,r._DesignError=void 0,r.on("input",(function(e,n,t){if(!r._mayBeUsed)return(null==t?r.error:t)("reusable-in: must not be used due to design errors");(n=n||function(){r.send.apply(r,arguments)})(e),t&&t()}));var t="reusable:"+n.id;function o(e){r.receive(e)}e.events.on(t,o);var s="tweak-"+n.id;function u(e){var n=e[0],t=e[1];r[n]=t,"_DesignError"===n&&(null==t?r.status({}):(r._mayBeUsed=!1,r.status({fill:"red",shape:"dot",text:t})))}e.events.on(s,u),r.on("close",(function(){e.events.removeListener(t,o),e.events.removeListener(s,u)}))})),e.nodes.registerType("reusable-out",(function(n){e.nodes.createNode(this,n);var r=this;r.position=n.position,r._Index=void 0,r._mayBeUsed=!1,r._DesignError=void 0,r.on("input",(function(n,t,o){if(!r._mayBeUsed)return(null==o?r.error:o)("reusable-out: must not be used due to design errors");try{var s=n._reusableFlows,u=s.Stack.pop();if(null==u)throw'reusable-out: no "reusable" node to return to found';s.Mode="return",s.Index=r._Index,e.events.emit("reusable:"+u,n),o&&o()}catch(e){return(null==o?r.error:o)('reusable-out: broken "msg" (broken or missing internals)')}}));var t="tweak-"+n.id;function o(e){var n=e[0],t=e[1];r[n]=t,"_DesignError"===n&&(null==t?r.status({}):(r._mayBeUsed=!1,r.status({fill:"red",shape:"dot",text:t})))}e.events.on(t,o),r.on("close",(function(){e.events.removeListener(t,o)}))})),e.nodes.registerType("reusable",(function(n){e.nodes.createNode(this,n);var r=this;r.target=n.target,r.outputs=n.outputs,r._TargetNode=void 0,r._mayBeUsed=!1,r._DesignError=void 0,r.on("input",(function(t,o,s){if(!r._mayBeUsed)return(null==s?r.error:s)("reusable: must not be used due to design errors");o=o||function(){r.send.apply(r,arguments)};var u=t._reusableFlows;switch(null==u&&(u=t._reusableFlows={Stack:[]}),u.Mode){case void 0:u.Stack.push(n.id),e.events.emit("reusable:"+r._TargetNode.id,t);break;case"return":var i=u.Index;switch(delete u.Mode,delete u.Index,!0){case 1===r.outputs:o(t);break;case 0===i:o([t]);break;case"number"!=typeof i:case Math.round(i)!==i:case i<0:case i>=r.outputs:return(null==s?r.error:s)('reusable: broken "msg" (invalid "Index")');default:var a=new Array(r.outputs);a[i]=t,o(a)}s&&s();break;default:return(null==s?r.error:s)('reusable: broken "msg" (missing "Mode")')}}));var t="reusable:"+n.id;function o(e){r.receive(e)}e.events.on(t,o);var s="tweak-"+n.id;function u(e){var n=e[0],t=e[1];r[n]=t,"_DesignError"===n&&(null==t?r.status({}):(r._mayBeUsed=!1,r.status({fill:"red",shape:"dot",text:t})))}e.events.on(s,u),r.on("close",(function(){e.events.removeListener(t,o),e.events.removeListener(s,u)}))})),e.events.on("flows:started",(function(){var n=Object.create(null);e.nodes.eachNode((function(e){n[e.id]=e}));var r=Object.create(null);function t(n,r,t){n[r]=t,"_DesignError"===r&&null!=t&&(n._mayBeUsed=!1),e.events.emit("tweak-"+n.id,[r,t])}function o(e,n){t(e,"_DesignError",n)}function s(e){t(e,"_DesignError",void 0)}function u(n,r){n=n.toLowerCase();var t=[];return e.nodes.eachNode((function(e){"reusable-in"===e.type&&l[e.z]===r&&(e.name||"").trim().toLowerCase()===n&&t.push(e)})),t}e.nodes.eachNode((function(e){(e.wires||[]).flat().forEach((function(n){n in r?r[n].push(e.id):r[n]=[e.id]}))}));var i,a=[],l=Object.create(null);e.nodes.eachNode((function(e){"tab"===e.type&&(l[e.id]=e,a.push(e))}));try{(i=[],e.nodes.eachNode((function(e){"reusable-out"===e.type&&i.push(e)})),i).forEach((function(e){if(null==l[e.z])return o(e,"do not end reusable flows within subflows");var u=function(e){var t=Object.create(null);t[e.id]=e,function e(o){(r[o.id]||[]).forEach((function(r){if(!(r in t)){var o=n[r];t[r]=o,e(o)}}))}(e);var o=[];for(var s in delete t[e.id],t)o.push(t[s]);return o}(e).filter((function(e){return"reusable-in"===e.type}));if(0===u.length)return o(e,'no connected "reusable-in" node');if(u.length>1)return o(e,'multiple connected "reusable-in" nodes');var i=parseInt(e.position,10)-1;if(isNaN(i))return o(e,'invalid "position"');t(e,"_Index",i),t(e,"_mayBeUsed",!0),s(e)})),function(){var r;(r=[],e.nodes.eachNode((function(e){"reusable-in"===e.type&&r.push(e)})),r).forEach((function(e){if(null==l[e.z])return o(e,"do not begin reusable flows within subflows");var r=(e.name||"").trim().toLowerCase();if(""===r)return o(e,"no flow name given");if(u(r,l[e.z]).length>1)return o(e,'multiple "reusable-in" nodes with this name');var i=function(e){var r=Object.create(null);r[e.id]=e,function e(t){t.wires.flat().forEach((function(t){if(!(t in r)){var o=n[t];r[t]=o,e(o)}}))}(e);var t=[];for(var o in delete r[e.id],r)t.push(r[o]);return t}(e).filter((function(e){return"reusable-out"===e.type}));if(0===i.length)return o(e,'no connected "reusable-out" node');if(s(e),1===i.length){var a=i[0];a._Index>=1&&o(a,"invalid output position"),t(e,"outputs",1)}else{var d=Object.create(null),c=new Array(i.length);i.forEach((function(e){var n=e._Index;if(n>=i.length)return o(e,"invalid output position");if(null!=c[n])return o(c[n],"multiply used output position"),void o(e,"multiply used output position");c[n]=e;var r=(e.name||"").trim().toLowerCase();if(""!==r){if(null!=d[r])return o(c[n],"multiply used output label"),void o(e,"multiply used output label");d[r]=e}})),t(e,"outputs",c.length)}i.forEach((function(e){return t(e,"_mayBeUsed",null==e._DesignError)})),t(e,"_mayBeUsed",null==e._DesignError&&i.reduce((function(e,n){return e&&n._mayBeUsed}),!0)),e._mayBeUsed?s(e):null==e._DesignError&&o(e,'error in "reusable-out" node')}))}(),function(){var n;(n=[],e.nodes.eachNode((function(e){"reusable"===e.type&&n.push(e)})),n).forEach((function(e){if(null==l[e.z])return o(e,"do not invoke reusable flows from within subflows");var n,r,i=(e.target||"").trim().toLowerCase();if(""===i)return o(e,"missing target specification");i.indexOf(":")<0?(n="",r=i):(n=i.replace(/\s*:.*$/,""),r=i.replace(/^[^:]*:\s*/,""));var d=l[e.z];if(""!==n){var c=function(e){e=e.trim().toLowerCase();var n=[];return a.forEach((function(r){r.label.trim().toLowerCase()===e&&n.push(r)})),n}(n);switch(c.length){case 0:return o(e,"no such target workspace");case 1:d=c[0];break;default:return o(e,"multiple target workspaces")}}if(""===r)return o(e,"missing target flow name");var f=u(r,d).filter((function(n){return"global"===n.scope||n.z===e.z}));switch(f.length){case 0:return o(e,"no such target flow");case 1:t(e,"_TargetNode",f[0]);break;default:return o(e,"multiple target flows")}t(e,"_mayBeUsed",e._TargetNode._mayBeUsed),e._mayBeUsed?s(e):o(e,"error in target flow")}))}()}catch(e){console.error(e)}}))};
//# sourceMappingURL=reusable-flows.js.map
