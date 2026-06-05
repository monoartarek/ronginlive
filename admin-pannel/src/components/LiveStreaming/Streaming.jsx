// import React, { useEffect, useState, useRef, useCallback } from "react";
// import Parse from "../../parseConfig";
// import AgoraRTC from "agora-rtc-sdk-ng";
// import "./Streaming.css";
// import emptySeatImg from "../../assets/seat_mic.png";

// const PER_PAGE = 12;
// const FILTERS  = [
//   { key:"ALL",   label:"All",   icon:"◈" },
//   { key:"audio", label:"Audio", icon:"♬" },
//   { key:"video", label:"Video", icon:"▶" },
//   { key:"multi", label:"Multi", icon:"⊞" },
// ];

// function tc(t){
//   if(t==="video") return{bg:"rgba(59,130,246,.15)", bd:"rgba(59,130,246,.45)", tx:"#60a5fa"};
//   if(t==="audio") return{bg:"rgba(129,140,248,.15)",bd:"rgba(129,140,248,.45)",tx:"#a5b4fc"};
//   if(t==="multi") return{bg:"rgba(6,182,212,.15)",  bd:"rgba(6,182,212,.45)",  tx:"#22d3ee"};
//   return          {bg:"rgba(148,163,184,.12)",bd:"rgba(148,163,184,.3)",tx:"#94a3b8"};
// }
// function glyph(t){ return t==="video"?"▶":t==="audio"?"♬":t==="multi"?"⊞":"◈"; }
// function ini(n=""){ return(n||"").trim().split(/\s+/).map(w=>w[0]||"").join("").toUpperCase().slice(0,2)||"?"; }
// function imgUrl(v){
//   if(!v) return "";
//   if(typeof v==="string") return v;
//   if(typeof v.url==="function") return v.url();
//   if(v.url) return v.url;
//   return "";
// }
// function ago(d){
//   if(!d) return "";
//   const s=Math.floor((Date.now()-new Date(d))/1000);
//   if(s<60)   return`${s}s ago`;
//   if(s<3600) return`${Math.floor(s/60)}m ago`;
//   return`${Math.floor(s/3600)}h ago`;
// }
// function hhmm(d){
//   if(!d) return "";
//   return new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
// }
// function fmt(n){
//   if(n>=1e6) return(n/1e6).toFixed(1)+"M";
//   if(n>=1e3) return(n/1e3).toFixed(1)+"K";
//   return String(n||0);
// }

// export default function LiveStreaming(){

//   /* ── state ── */
//   const [streams,     setStreams]    = useState([]);
//   const [filter,      setFilter]    = useState("ALL");
//   const [search,      setSearch]    = useState("");
//   const [page,        setPage]      = useState(0);
//   const [toast,       setToast]     = useState(null);
//   const [viewer,      setViewer]    = useState(null);
//   const [remoteUsers, setRemoteUsers]= useState([]);
//   const [joining,     setJoining]   = useState(false);
//   const [muted,       setMuted]     = useState(false);
//   const [spotUid,     setSpotUid]   = useState(null);
//   const [vCount,      setVCount]    = useState(0);
//   const [comments,    setComments]  = useState([]);
//   const [cmtLoading,  setCmtLoading]= useState(false);
//   const [tab,         setTab]       = useState("comments");
//   const [cutModal,    setCutModal]  = useState(null);
//   const [minimized,   setMinimized] = useState(false);
//   const [leaveModal,  setLeaveModal]= useState(false);

//   /* ── refs ── */
//   const clientRef      = useRef(null);
//   const chatEnd        = useRef(null);
//   const cmtTimer       = useRef(null);
//   const uidRef         = useRef(Math.floor(Math.random()*900000)+100000);
//   const mutedRef       = useRef(false);   // current mute state for event handlers
//   const minimizedRef   = useRef(false);   // current minimized state for event handlers
//   const remoteUsersRef = useRef([]);      // current users for unmount cleanup

//   /* keep refs in sync */
//   useEffect(()=>{ mutedRef.current     = muted;       }, [muted]);
//   useEffect(()=>{ minimizedRef.current = minimized;   }, [minimized]);
//   useEffect(()=>{ remoteUsersRef.current = remoteUsers;}, [remoteUsers]);

//   /* ─────────────────────────────────────────────────────
//      FIX 3 — AUTO-LEAVE ON ROUTE CHANGE
//      useEffect with empty deps: cleanup runs on unmount.
//      This fires whenever the user navigates away from this page.
//   ───────────────────────────────────────────────────── */
//   useEffect(()=>{
//     return ()=>{
//       clearInterval(cmtTimer.current);
//       if(clientRef.current){
//         remoteUsersRef.current.forEach(u=>{
//           try{ u.videoTrack?.stop(); u.audioTrack?.stop(); }catch(e){}
//         });
//         try{ clientRef.current.leave(); }catch(e){}
//         clientRef.current = null;
//       }
//     };
//   }, []); // runs once, cleanup on unmount

//   /* ── toast ── */
//   const toast$=useCallback((msg,type="info")=>{
//     setToast({msg,type});
//     setTimeout(()=>setToast(null),3200);
//   },[]);

//   /* ── fetch streams every 6s ── */
//   const fetchStreams=useCallback(async()=>{
//     try{
//       const q=new Parse.Query("Streaming");
//       q.equalTo("streaming",true);
//       q.descending("createdAt");
//       q.limit(200);
//       setStreams(await q.find({useMasterKey:true}));
//     }catch(e){console.error(e);}
//   },[]);
//   useEffect(()=>{
//     fetchStreams();
//     const t=setInterval(fetchStreams,6000);
//     return()=>clearInterval(t);
//   },[fetchStreams]);

//   /* ── fetch comments ── */
//   const fetchComments=useCallback(async(roomId)=>{
//     if(!roomId) return;
//     setCmtLoading(true);
//     try{
//       const q=new Parse.Query("SteamingComments");
//       q.equalTo("room_id",roomId);
//       q.descending("sendAt");
//       q.limit(80);
//       const res=await q.find({useMasterKey:true});
//       setComments(res.map(c=>({
//         id:    c.id,
//         msg:   c.get("message")   ||"",
//         name:  c.get("name")      ||"Anonymous",
//         image: c.get("image")     ||null,
//         level: c.get("UserLevel") ||0,
//         at:    c.get("sendAt")    ||c.createdAt,
//       })).reverse());
//     }catch(e){console.error(e);}
//     finally{setCmtLoading(false);}
//   },[]);
//   useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[comments]);

//   /* ─────────────────────────────────────────────────────
//      FIX 1A — VIDEO ROUTING
//      Runs AFTER React paints DOM so the element is ready.
//      Because we keep user references intact (no spread),
//      user.videoTrack is always the real Agora track object.
//   ───────────────────────────────────────────────────── */
//   useEffect(()=>{
//     if(!viewer) return;
//     const elId = minimized?"lv-video-mini":"lv-video-player";
//     const target = spotUid
//       ? remoteUsers.find(u=>u.uid===spotUid && u.videoTrack)
//       : remoteUsers.find(u=>u.videoTrack);
//     if(!target?.videoTrack) return;
//     const el = document.getElementById(elId);
//     if(el) target.videoTrack.play(el);
//   },[remoteUsers, viewer, minimized, spotUid]);

//   /* ── leave ── */
//   const leave=useCallback(async()=>{
//     clearInterval(cmtTimer.current);
//     try{
//       if(clientRef.current){
//         remoteUsers.forEach(u=>{ u.videoTrack?.stop(); u.audioTrack?.stop(); });
//         await clientRef.current.leave();
//       }
//     }catch(e){console.error(e);}
//     clientRef.current=null;
//     setRemoteUsers([]); setViewer(null);   setSpotUid(null);
//     setJoining(false);  setVCount(0);      setComments([]);
//     setMuted(false);    setMinimized(false); setLeaveModal(false);
//     mutedRef.current=false;
//   },[remoteUsers]);

//   /* ── mute — setVolume keeps track alive ── */
//   const toggleMute=useCallback(()=>{
//     const next=!mutedRef.current;
//     mutedRef.current=next;
//     remoteUsers.forEach(u=>{ if(u.audioTrack) u.audioTrack.setVolume(next?0:100); });
//     setMuted(next);
//   },[remoteUsers]);

//   /* ─────────────────────────────────────────────────────
//      JOIN
//   ───────────────────────────────────────────────────── */
//   const joinStream=async(item)=>{
//     if(joining) return;
//     setJoining(true);
//     setViewer(item);
//     setMinimized(false);
//     setTab("comments");
//     setSpotUid(null);

//     const channel=item.get("streaming_channel");
//     const uid=uidRef.current;
//     const roomId=item.id;

//     fetchComments(roomId);
//     clearInterval(cmtTimer.current);
//     cmtTimer.current=setInterval(()=>fetchComments(roomId),5000);

//     try{
//       let appId="2d4a06e9b40c43448a137a983dd2ee98", token=null;

//       try{
//         //last e sudhu { useMasterKey: true }); kore diyechi ager ta kaj kortechilo na and app id change korechi 
//         const res = await Parse.Cloud.run("generateAgoraToken", { channelName: channel, uid }, { useMasterKey: true });
//         if(res&&typeof res==="object"){
//           token=res.token||res.Token||res.accessToken||null;
//           appId=res.appId||res.AppId||res.app_id||appId;
//         } else if(typeof res==="string"&&res.length>10) token=res;
//       }catch(cfErr){console.warn("CF:",cfErr.message);}
//       if(!token) throw new Error("No token returned. Check AgoraAppID/AgoraAppCertificate.");

//       const client=AgoraRTC.createClient({mode:"live",codec:"vp8"});
//       clientRef.current=client;
//       await client.setClientRole("audience");

//       /* ─────────────────────────────────────────────
//          FIX 1B — user-published handler
//          • NEVER spread the Agora user ({...u,...user})
//            because spread breaks prototype getters and
//            the videoTrack/audioTrack references are lost.
//          • Keep the original user object reference so
//            the video routing useEffect finds real tracks.
//          • Also play video immediately (requestAnimationFrame)
//            as a belt-and-suspenders safety net.
//       ───────────────────────────────────────────── */
//       client.on("user-published", async(user, mediaType)=>{
//         await client.subscribe(user, mediaType);

//         if(mediaType==="audio"){
//           user.audioTrack?.play();
//           /* Apply current mute state to newly subscribed audio */
//           if(mutedRef.current && user.audioTrack){
//             user.audioTrack.setVolume(0);
//           }
//         }

//         if(mediaType==="video"){
//           /* Play immediately — element exists because setViewer
//              fired before this, so React already rendered the viewer */
//           requestAnimationFrame(()=>{
//             const elId = minimizedRef.current?"lv-video-mini":"lv-video-player";
//             const el   = document.getElementById(elId);
//             if(el && user.videoTrack) user.videoTrack.play(el);
//           });
//         }

//         /* Keep user reference intact — don't spread!
//            Agora mutates the same object (adds videoTrack).
//            A shallow copy of the array triggers re-render
//            while keeping every user's reference correct. */
//         setRemoteUsers(prev=>{
//           const exists=prev.find(u=>u.uid===user.uid);
//           if(exists) return [...prev];   // same refs, new array → re-render
//           return [...prev, user];
//         });
//       });

//       /* FIX 1C — user-unpublished: Agora already nulled the track
//          on the user object. A shallow copy triggers re-render so
//          the hasVideo check updates and the avatar backdrop shows. */
//       client.on("user-unpublished",()=>{
//         setRemoteUsers(prev=>[...prev]);
//       });

//       client.on("user-left",user=>{
//         setRemoteUsers(prev=>prev.filter(u=>u.uid!==user.uid));
//         setSpotUid(prev=>prev===user.uid?null:prev);
//       });

//       client.on("user-joined",()=>setVCount(c=>c+1));

//       await client.join(appId,channel,token,uid);
//       setJoining(false);
//       toast$("Joined stream!","success");

//     }catch(err){
//       console.error(err);
//       toast$("Join failed: "+err.message,"error");
//       leave();
//     }
//   };

//   /* ── cut stream ── */
//   const cutStream=async()=>{
//     if(!cutModal) return;
//     const item=cutModal;
//     setCutModal(null);
//     try{
//       const obj=await new Parse.Query("Streaming").get(item.id,{useMasterKey:true});
//       obj.set("streaming",false);
//       await obj.save(null,{useMasterKey:true});
//       toast$(`Stream cut: ${item.get("username")||"unknown"}`,"success");
//       if(viewer?.id===item.id) leave();
//       fetchStreams();
//     }catch(err){ toast$("Cut failed: "+err.message,"error"); }
//   };

//   /* ── leave modal actions ── */
//   const doLeave    = ()=>{ setLeaveModal(false); leave(); };
//   const doMinimize = ()=>{ setLeaveModal(false); setMinimized(true); };
//   const doRestore  = ()=>setMinimized(false);

//   /* ── 3D card tilt ── */
//   const on3D=(e)=>{
//     const el=e.currentTarget;
//     const r=el.getBoundingClientRect();
//     const x=((e.clientX-r.left)/r.width -0.5)*14;
//     const y=((e.clientY-r.top) /r.height-0.5)*14;
//     el.style.transform=`perspective(700px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-6px) scale(1.02)`;
//   };
//   const off3D=(e)=>{ e.currentTarget.style.transform=""; };

//   /* ── seat generator ── */
//   const genSeats=()=>{
//     if(!viewer) return null;
//     const n=viewer.get("number_of_chairs")||8;
//     const cohosts=viewer.get("cohost_list")||[];
//     return Array.from({length:n},(_,i)=>{
//       const u=cohosts.find(c=>c.seatIndex===i);
//       return(
//         <div key={i} className="seat">
//           {u
//             ?<img src={u.image} alt={u.name}/>
//             :<div className="empty-seat">
//               <img src={emptySeatImg} alt="empty" className="empty-seat-img"/>
//             </div>
//           }
//         </div>
//       );
//     });
//   };

//   /* ── filter + paginate ── */
//   const filtered=streams.filter(i=>{
//     const ok=filter==="ALL"||i.get("party_type")===filter;
//     const q=search.toLowerCase();
//     const srch=!q
//       ||(i.get("username")||"").toLowerCase().includes(q)
//       ||(i.get("audio_room_title")||"").toLowerCase().includes(q);
//     return ok&&srch;
//   });
//   const totalPages   = Math.ceil(filtered.length/PER_PAGE);
//   const pageItems    = filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE);
//   const totalViewers = streams.reduce((s,i)=>(i.get("joined_users")||[]).length+s,0);
//   const totalDiamonds= streams.reduce((s,i)=>(i.get("streaming_diamonds")||0)+s,0);

//   /* ── derived viewer values ── */
//   const hostImg   = imgUrl(viewer?.get("image"));
//   const hostName  = viewer?.get("username") || "Live Stream";
//   const hasVideo  = remoteUsers.some(u=>u.videoTrack);
//   const partyType = viewer?.get("party_type") || "audio";

//   /* ═══════════════════════════════════════════════════════
//      RENDER
//   ═══════════════════════════════════════════════════════ */
//   return(
//     <div className="ls-root">

//       {/* Animated background */}
//       <div className="ls-bg" aria-hidden="true">
//         <div className="ls-bg-b1"/><div className="ls-bg-b2"/><div className="ls-bg-b3"/>
//         <div className="ls-bg-grid"/>
//       </div>

//       {/* Toast */}
//       {toast&&(
//         <div className={`ls-toast ls-toast--${toast.type}`}>
//           <span className="ls-toast-dot"/>{toast.msg}
//         </div>
//       )}

//       {/* ══ LEAVE MODAL ══ */}
//       {leaveModal&&viewer&&(
//         <div className="ls-overlay ls-overlay--leave" onClick={()=>setLeaveModal(false)}>
//           <div className="ls-lm" onClick={e=>e.stopPropagation()}>
//             <div className="ls-lm-glow"/>
//             <div className="ls-lm-preview">
//               <div className="ls-lm-av-ring">
//                 <div className="ls-lm-av">{ini(viewer.get("username")||"?")}</div>
//               </div>
//               <div className="ls-lm-info">
//                 <p className="ls-lm-name">{viewer.get("username")||"Live Stream"}</p>
//                 <p className="ls-lm-meta">{viewer.get("party_type")} · {hhmm(viewer.createdAt)}</p>
//               </div>
//               <span className="ls-lm-live-badge">
//                 <span className="ls-lm-live-pulse"/>LIVE
//               </span>
//             </div>
//             <h3 className="ls-lm-title">What would you like to do?</h3>
//             <p className="ls-lm-sub">The stream is still playing</p>
//             <div className="ls-lm-opts">
//               <button className="ls-lm-opt ls-lm-opt--min" onClick={doMinimize}>
//                 <div className="ls-lm-opt-ico-wrap ls-lm-opt-ico-wrap--min">
//                   <span className="ls-lm-opt-ico">⊟</span>
//                 </div>
//                 <div>
//                   <p className="ls-lm-opt-ttl">Minimize</p>
//                   <p className="ls-lm-opt-desc">Keep playing in a floating window</p>
//                 </div>
//                 <span className="ls-lm-opt-arr">›</span>
//               </button>
//               <button className="ls-lm-opt ls-lm-opt--leave" onClick={doLeave}>
//                 <div className="ls-lm-opt-ico-wrap ls-lm-opt-ico-wrap--leave">
//                   <span className="ls-lm-opt-ico">✕</span>
//                 </div>
//                 <div>
//                   <p className="ls-lm-opt-ttl">Leave Stream</p>
//                   <p className="ls-lm-opt-desc">Disconnect and stop audio/video</p>
//                 </div>
//                 <span className="ls-lm-opt-arr">›</span>
//               </button>
//             </div>
//             <button className="ls-lm-cancel" onClick={()=>setLeaveModal(false)}>
//               Cancel — Stay in stream
//             </button>
//           </div>
//         </div>
//       )}

//       {/* ══ CUT MODAL ══ */}
//       {cutModal&&(
//         <div className="ls-overlay ls-overlay--modal" onClick={()=>setCutModal(null)}>
//           <div className="ls-cut-modal" onClick={e=>e.stopPropagation()}>
//             <div className="ls-cut-icon">⊘</div>
//             <h3 className="ls-cut-title">Cut Stream</h3>
//             <p className="ls-cut-desc">
//               Force-stop <strong>{cutModal.get("username")||"this"}'s</strong> stream?
//               They will be disconnected immediately.
//             </p>
//             <div className="ls-cut-btns">
//               <button className="ls-btn ls-btn--ghost" onClick={()=>setCutModal(null)}>Cancel</button>
//               <button className="ls-btn ls-btn--red" onClick={cutStream}>✕ Cut Stream</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ══════ STREAM GRID ══════ */}
//       <div className={`ls-page${viewer&&!minimized?" ls-page--hidden":""}`}>

//         {/* Header */}
//         <div className="ls-header">
//           <div className="ls-header-left">
//             <div className="ls-live-dot"/>
//             <div>
//               <h1 className="ls-title">Live Streams</h1>
//               <p className="ls-subtitle">Real-time broadcast monitor</p>
//             </div>
//             <div className="ls-badge-wrap">
//               <span className="ls-badge-num">{streams.length}</span>
//               <span className="ls-badge-lbl">LIVE</span>
//             </div>
//           </div>
//           <div className="ls-header-right">
//             <div className="ls-search-wrap">
//               <span className="ls-search-ico">⌕</span>
//               <input className="ls-search" placeholder="Search host or title…"
//                 value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/>
//               {search&&<button className="ls-search-x" onClick={()=>{setSearch("");setPage(0);}}>✕</button>}
//             </div>
//             <button className="ls-icon-btn" onClick={fetchStreams} title="Refresh">↻</button>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="ls-stats">
//           <div className="ls-stat">
//             <div className="ls-stat-ico-wrap" style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.25)"}}>
//               <span style={{color:"#ef4444"}}>●</span>
//             </div>
//             <div><p className="ls-stat-val">{streams.length}</p><p className="ls-stat-lbl">Live Now</p></div>
//           </div>
//           <div className="ls-stat-div"/>
//           <div className="ls-stat">
//             <div className="ls-stat-ico-wrap" style={{background:"rgba(59,130,246,.12)",border:"1px solid rgba(59,130,246,.25)"}}>
//               <span style={{color:"#60a5fa"}}>👁</span>
//             </div>
//             <div><p className="ls-stat-val">{fmt(totalViewers)}</p><p className="ls-stat-lbl">Watching</p></div>
//           </div>
//           <div className="ls-stat-div"/>
//           <div className="ls-stat">
//             <div className="ls-stat-ico-wrap" style={{background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.25)"}}>
//               <span style={{color:"#fbbf24"}}>💎</span>
//             </div>
//             <div><p className="ls-stat-val">{fmt(totalDiamonds)}</p><p className="ls-stat-lbl">Diamonds</p></div>
//           </div>
//         </div>

//         {/* Filter tabs */}
//         <div className="ls-tabs">
//           {FILTERS.map(f=>(
//             <button key={f.key} className={`ls-tab${filter===f.key?" on":""}`}
//               onClick={()=>{setFilter(f.key);setPage(0);}}>
//               <span className="ls-tab-ico">{f.icon}</span>{f.label}
//               <span className="ls-tab-ct">
//                 {f.key==="ALL"?streams.length:streams.filter(i=>i.get("party_type")===f.key).length}
//               </span>
//             </button>
//           ))}
//           <span className="ls-tab-info">{filtered.length} result{filtered.length!==1?"s":""}</span>
//         </div>

//         {/* Grid */}
//         <div className="ls-grid-wrap">
//           {pageItems.length===0?(
//             <div className="ls-empty">
//               <div className="ls-empty-glow"/>
//               <div className="ls-empty-icon">📡</div>
//               <p className="ls-empty-ttl">No live streams right now</p>
//               <small>Try a different filter or refresh</small>
//             </div>
//           ):(
//             <div className="ls-grid">
//               {pageItems.map((item,idx)=>{
//                 const name    =item.get("username")         ||"Anonymous";
//                 const img     =imgUrl(item.get("image"));
//                 const type    =item.get("party_type")       ||"audio";
//                 const viewers =(item.get("joined_users")||[]).length;
//                 const title   =item.get("audio_room_title")||item.get("title")||name+"'s Stream";
//                 const diamonds=item.get("streaming_diamonds")||0;
//                 const col     =tc(type);
//                 return(
//                   <div key={item.id} className="ls-card"
//                     style={{animationDelay:`${idx*40}ms`}}
//                     onMouseMove={on3D} onMouseLeave={off3D}>
//                     <div className="ls-thumb" onClick={()=>joinStream(item)}>
//                       {img
//                         ?<img src={img} alt={name} className="ls-thumb-img"/>
//                         :<div className={`ls-thumb-ph ls-thumb-ph--${type}`}>
//                           <div className="ls-thumb-ph-inner">
//                             {type==="audio"&&(
//                               <div className="ls-ph-waves">
//                                 {[...Array(5)].map((_,i)=>(
//                                   <div key={i} className="ls-ph-wave" style={{animationDelay:`${i*.15}s`}}/>
//                                 ))}
//                               </div>
//                             )}
//                             <span className="ls-ph-glyph">{glyph(type)}</span>
//                           </div>
//                         </div>
//                       }
//                       <div className="ls-thumb-overlay"/>
//                       {img&&(
//                         <div className="ls-thumb-host-av">
//                           <div className="ls-thumb-av-ring">
//                             <div className="ls-thumb-av">{ini(name)}</div>
//                           </div>
//                         </div>
//                       )}
//                       <div className="ls-live-badge">
//                         <span className="ls-live-pulse"/><span>LIVE</span>
//                       </div>
//                       <span className="ls-type-badge"
//                         style={{background:col.bg,borderColor:col.bd,color:col.tx}}>
//                         {glyph(type)}&nbsp;{type}
//                       </span>
//                       <div className="ls-thumb-stats">
//                         <span className="ls-stat-pill">👁&nbsp;{viewers}</span>
//                         {diamonds>0&&<span className="ls-stat-pill ls-stat-pill--gold">💎&nbsp;{fmt(diamonds)}</span>}
//                       </div>
//                     </div>
//                     <div className="ls-card-body">
//                       <div className="ls-card-host">
//                         <div className="ls-av-ring">
//                           {img
//                             ?<img src={img} alt={name} className="ls-av-img"/>
//                             :<div className="ls-av">{ini(name)}</div>
//                           }
//                         </div>
//                         <div className="ls-card-meta">
//                           <p className="ls-card-name">{name}</p>
//                           <p className="ls-card-when">{hhmm(item.createdAt)}</p>
//                         </div>
//                         <span className="ls-card-type-dot"
//                           style={{background:col.tx,boxShadow:`0 0 6px ${col.tx}`}}/>
//                       </div>
//                       <p className="ls-card-ttl" title={title}>{title}</p>
//                       <div className="ls-card-foot">
//                         <button className={`ls-watch-btn ls-watch-btn--${type}`}
//                           onClick={()=>joinStream(item)} disabled={joining}>
//                           {joining?<span className="ls-spin"/>
//                             :<><span className="ls-watch-ico">{glyph(type)}</span>
//                               {type==="audio"?"Listen Now":"Watch Now"}</>
//                           }
//                         </button>
//                         <button className="ls-cut-btn" title="Cut stream"
//                           onClick={()=>setCutModal(item)}>⊘</button>
//                       </div>
//                     </div>
//                     <div className="ls-card-shine"/>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//           {totalPages>1&&(
//             <div className="ls-pages">
//               <button className="ls-pg" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</button>
//               {Array.from({length:totalPages},(_,i)=>(
//                 <button key={i} className={`ls-pg${page===i?" on":""}`} onClick={()=>setPage(i)}>{i+1}</button>
//               ))}
//               <button className="ls-pg" disabled={page===totalPages-1} onClick={()=>setPage(p=>p+1)}>›</button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ══════ FULL VIEWER ══════ */}
//       {viewer&&!minimized&&(
//         <div className="ls-viewer">
//           <div className="ls-vnav">
//             <div className="ls-vnav-left">
//               <button className="ls-back" onClick={()=>setLeaveModal(true)}>← Back</button>
//               <div className="ls-vhost">
//                 <span className="ls-vpulse"/>
//                 <div className="ls-vav">{ini(hostName)}</div>
//                 <div>
//                   <p className="ls-vname">{hostName}</p>
//                   <p className="ls-vmeta">{partyType} · {(viewer.get("joined_users")||[]).length} in room</p>
//                 </div>
//               </div>
//             </div>
//             <div className="ls-vnav-right">
//               <span className="ls-vct">👁 {vCount+remoteUsers.length}</span>
//               <button className="ls-cut-nav" onClick={()=>setCutModal(viewer)}>⊘ Cut</button>
//               <button className="ls-leave-btn" onClick={()=>setLeaveModal(true)}>Leave ✕</button>
//             </div>
//           </div>

//           <div className="ls-vbody">
//             <div className="ls-vcol">

//               {/* ───────────────────────────────────────────────
//                   FIX 2 — THREE INDEPENDENT STAGE LAYERS
//                   Layer 0: blurred avatar backdrop (always present)
//                   Layer 1: lv-video-player (pure Agora target, NO children)
//                   Layer 2: overlay shown only when no video track
//                   This prevents React/Agora DOM conflicts and
//                   gives the avatar-as-background effect.
//               ─────────────────────────────────────────────── */}
//               <div className="ls-vstage">

//                 {/* Layer 0 — Blurred avatar / gradient backdrop */}
//                 <div className="ls-stage-bg">
//                   {hostImg
//                     ?<img src={hostImg} alt="" className="ls-stage-bg-img"/>
//                     :<div className="ls-stage-bg-grad"/>
//                   }
//                   <div className="ls-stage-bg-tint"/>
//                 </div>

//                 {/* Layer 1 — Pure Agora target, never has React children */}
//                 <div id="lv-video-player" className="ls-vinner"/>

//                 {/* Layer 2 — Content overlay (seats or loading) */}
//                 {!hasVideo&&(
//                   <div className="ls-stage-fg">
//                     {partyType==="audio"
//                       ?<div className="seat-container">{genSeats()}</div>
//                       :(
//                         /* Video/multi room loading — big avatar + spinner */
//                         <div className="ls-stage-load">
//                           <div className="ls-stage-hero-wrap">
//                             <div className="ls-stage-hero-ring"/>
//                             {hostImg
//                               ?<img src={hostImg} alt={hostName} className="ls-stage-hero-img"/>
//                               :<div className="ls-stage-hero-av">{ini(hostName)}</div>
//                             }
//                           </div>
//                           <p className="ls-stage-hero-name">{hostName}</p>
//                           <div className="ls-stage-load-pill">
//                             <span className="ls-spin"/>
//                             <span>Connecting video stream…</span>
//                           </div>
//                         </div>
//                       )
//                     }
//                   </div>
//                 )}
//               </div>

//               {remoteUsers.length>1&&(
//                 <div className="ls-strip">
//                   {remoteUsers.map(u=>(
//                     <div key={u.uid}
//                       className={`ls-strip-item${spotUid===u.uid?" on":""}`}
//                       onClick={()=>setSpotUid(u.uid)}>
//                       <div className="ls-strip-ico">{u.videoTrack?"📷":"♬"}</div>
//                       <span className="ls-strip-lbl">…{String(u.uid).slice(-4)}</span>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               <div className="ls-ctrls">
//                 <button className={`ls-ctrl${muted?" on":""}`} onClick={toggleMute}>
//                   <span>{muted?"🔇":"🔊"}</span><small>{muted?"Unmute":"Mute"}</small>
//                 </button>
//                 <button className="ls-ctrl" onClick={()=>setLeaveModal(true)}>
//                   <span>⊟</span><small>Minimize</small>
//                 </button>
//                 <button className="ls-ctrl ls-ctrl--red" onClick={()=>setLeaveModal(true)}>
//                   <span>📞</span><small>Leave</small>
//                 </button>
//               </div>
//             </div>

//             <aside className="ls-sidebar">
//               <div className="ls-stabs">
//                 <button className={`ls-stab${tab==="comments"?" on":""}`}
//                   onClick={()=>setTab("comments")}>
//                   💬 Comments
//                   {comments.length>0&&<span className="ls-cbadge">{comments.length}</span>}
//                 </button>
//                 <button className={`ls-stab${tab==="info"?" on":""}`}
//                   onClick={()=>setTab("info")}>ℹ Info</button>
//               </div>

//               {tab==="comments"&&(
//                 <div className="ls-cmt-wrap">
//                   {cmtLoading&&comments.length===0?(
//                     <div className="ls-cmt-load"><span className="ls-spin"/>Loading…</div>
//                   ):comments.length===0?(
//                     <div className="ls-cmt-empty"><span>💬</span><p>No comments yet</p></div>
//                   ):(
//                     <div className="ls-cmt-list">
//                       {comments.map(c=>(
//                         <div key={c.id} className={`ls-cmt${c.msg==="Joined the Room"?" ls-cmt--join":""}`}>
//                           <div className="ls-cmt-av-wrap">
//                             {c.image
//                               ?<img src={c.image} alt={c.name} className="ls-cmt-av"/>
//                               :<div className="ls-cmt-av ls-cmt-av--ini">{ini(c.name)}</div>
//                             }
//                             {c.level>0&&<span className="ls-cmt-lv">Lv{c.level}</span>}
//                           </div>
//                           <div className="ls-cmt-body">
//                             <div className="ls-cmt-row">
//                               <span className="ls-cmt-name">{c.name}</span>
//                               <span className="ls-cmt-time">{ago(c.at)}</span>
//                             </div>
//                             <p className="ls-cmt-msg">{c.msg}</p>
//                           </div>
//                         </div>
//                       ))}
//                       <div ref={chatEnd}/>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {tab==="info"&&(
//                 <div className="ls-info-wrap">
//                   <div className="ls-info-sec">
//                     <p className="ls-info-lbl">Stream Info</p>
//                     {[
//                       ["Channel",  viewer.get("streaming_channel")||"—"],
//                       ["Type",     partyType],
//                       ["Title",    viewer.get("audio_room_title")||viewer.get("title")||"—"],
//                       ["Host",     hostName],
//                       ["Diamonds", fmt(viewer.get("streaming_diamonds")||0)+" 💎"],
//                       ["In Room",  (viewer.get("joined_users")||[]).length],
//                       ["Started",  hhmm(viewer.createdAt)],
//                     ].map(([k,v],i)=>(
//                       <div key={i} className="ls-info-row">
//                         <span className="ls-info-k">{k}</span>
//                         <span className="ls-info-v">{v}</span>
//                       </div>
//                     ))}
//                   </div>
//                   <div className="ls-info-sec">
//                     <p className="ls-info-lbl">People in Room</p>
//                     {(viewer.get("joined_users")||[]).map((u,i)=>(
//                       <div key={i} className="ls-person">
//                         {u.image
//                           ?<img src={u.image} alt={u.name} className="ls-person-av"/>
//                           :<div className="ls-person-av ls-person-av--ini">{ini(u.name)}</div>
//                         }
//                         <div className="ls-person-info">
//                           <span className="ls-person-name">{u.name}</span>
//                           <span className="ls-person-uid">uid: {u.uid}</span>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </aside>
//           </div>
//         </div>
//       )}

//       {/* ══════ MINI PLAYER ══════ */}
//       {viewer&&minimized&&(
//         <div className="ls-mini">
//           <div className="ls-mini-glow"/>
//           <div id="lv-video-mini"
//             className={`ls-mini-stage${hasVideo?"":" ls-mini-stage--audio"}`}>
//             {!hasVideo&&(
//               <div className="ls-mini-audio">
//                 {hostImg
//                   ?<img src={hostImg} alt={hostName} className="ls-mini-host-img"/>
//                   :<div className="ls-mini-av">{ini(hostName)}</div>
//                 }
//                 <div className="ls-mini-eq">
//                   {[...Array(5)].map((_,i)=>(
//                     <div key={i} className="ls-mini-eq-bar" style={{animationDelay:`${i*.11}s`}}/>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//           <div className="ls-mini-foot">
//             <div className="ls-mini-left">
//               <span className="ls-mini-live"/>
//               <div>
//                 <p className="ls-mini-name">{hostName}</p>
//                 <p className="ls-mini-meta">👁 {vCount+remoteUsers.length}</p>
//               </div>
//             </div>
//             <div className="ls-mini-ctrls">
//               <button className={`ls-mini-btn${muted?" ls-mini-btn--on":""}`}
//                 onClick={toggleMute} title={muted?"Unmute":"Mute"}>
//                 {muted?"🔇":"🔊"}
//               </button>
//               <button className="ls-mini-btn" onClick={doRestore} title="Restore">⤢</button>
//               <button className="ls-mini-btn ls-mini-btn--red"
//                 onClick={()=>setLeaveModal(true)} title="Leave">✕</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Joining loader */}
//       {joining&&(
//         <div className="ls-overlay ls-overlay--load">
//           <div className="ls-load-card">
//             <div className="ls-load-rings">
//               <div className="ls-ring r1"/><div className="ls-ring r2"/><div className="ls-ring r3"/>
//             </div>
//             <p>Connecting to stream…</p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

























// import React, { useEffect, useState, useRef, useCallback } from "react";
// import Parse from "../../parseConfig";
// import AgoraRTC from "agora-rtc-sdk-ng";
// import "./Streaming.css";
// import emptySeatImg from "../../assets/seat_mic.png";

// const PER_PAGE = 12;
// const FILTERS  = [
//   { key:"ALL",   label:"All",   icon:"◈" },
//   { key:"audio", label:"Audio", icon:"♬" },
//   { key:"video", label:"Video", icon:"▶" },
//   { key:"multi", label:"Multi", icon:"⊞" },
// ];

// function tc(t){
//   if(t==="video") return{bg:"rgba(59,130,246,.15)", bd:"rgba(59,130,246,.45)", tx:"#60a5fa"};
//   if(t==="audio") return{bg:"rgba(129,140,248,.15)",bd:"rgba(129,140,248,.45)",tx:"#a5b4fc"};
//   if(t==="multi") return{bg:"rgba(6,182,212,.15)",  bd:"rgba(6,182,212,.45)",  tx:"#22d3ee"};
//   return          {bg:"rgba(148,163,184,.12)",bd:"rgba(148,163,184,.3)",tx:"#94a3b8"};
// }
// function glyph(t){ return t==="video"?"▶":t==="audio"?"♬":t==="multi"?"⊞":"◈"; }
// function ini(n=""){ return(n||"").trim().split(/\s+/).map(w=>w[0]||"").join("").toUpperCase().slice(0,2)||"?"; }
// function imgUrl(v){
//   if(!v) return "";
//   if(typeof v==="string") return v;
//   if(typeof v.url==="function") return v.url();
//   if(v.url) return v.url;
//   return "";
// }
// function ago(d){
//   if(!d) return "";
//   const s=Math.floor((Date.now()-new Date(d))/1000);
//   if(s<60)   return`${s}s ago`;
//   if(s<3600) return`${Math.floor(s/60)}m ago`;
//   return`${Math.floor(s/3600)}h ago`;
// }
// function hhmm(d){
//   if(!d) return "";
//   return new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
// }
// function fmt(n){
//   if(n>=1e6) return(n/1e6).toFixed(1)+"M";
//   if(n>=1e3) return(n/1e3).toFixed(1)+"K";
//   return String(n||0);
// }

// export default function LiveStreaming(){

//   /* ── state ── */
//   const [streams,     setStreams]    = useState([]);
//   const [filter,      setFilter]    = useState("ALL");
//   const [search,      setSearch]    = useState("");
//   const [page,        setPage]      = useState(0);
//   const [toast,       setToast]     = useState(null);
//   const [viewer,      setViewer]    = useState(null);
//   const [remoteUsers, setRemoteUsers]= useState([]);
//   const [joining,     setJoining]   = useState(false);
//   const [muted,       setMuted]     = useState(false);
//   const [spotUid,     setSpotUid]   = useState(null);
//   const [vCount,      setVCount]    = useState(0);
//   const [comments,    setComments]  = useState([]);
//   const [cmtLoading,  setCmtLoading]= useState(false);
//   const [tab,         setTab]       = useState("comments");
//   const [cutModal,    setCutModal]  = useState(null);
//   const [minimized,   setMinimized] = useState(false);
//   const [leaveModal,  setLeaveModal]= useState(false);

//   /* ── Cut All modal state: null | "ALL" | "audio" | "video" | "multi" ── */
//   const [cutAllModal, setCutAllModal] = useState(null);
//   const [cutAllLoading, setCutAllLoading] = useState(false);

//   /* ── refs ── */
//   const clientRef      = useRef(null);
//   const chatEnd        = useRef(null);
//   const cmtTimer       = useRef(null);
//   const uidRef         = useRef(Math.floor(Math.random()*900000)+100000);
//   const mutedRef       = useRef(false);
//   const minimizedRef   = useRef(false);
//   const remoteUsersRef = useRef([]);

//   /* keep refs in sync */
//   useEffect(()=>{ mutedRef.current     = muted;       }, [muted]);
//   useEffect(()=>{ minimizedRef.current = minimized;   }, [minimized]);
//   useEffect(()=>{ remoteUsersRef.current = remoteUsers;}, [remoteUsers]);

//   /* ── auto-leave on unmount ── */
//   useEffect(()=>{
//     return ()=>{
//       clearInterval(cmtTimer.current);
//       if(clientRef.current){
//         remoteUsersRef.current.forEach(u=>{
//           try{ u.videoTrack?.stop(); u.audioTrack?.stop(); }catch(e){}
//         });
//         try{ clientRef.current.leave(); }catch(e){}
//         clientRef.current = null;
//       }
//     };
//   }, []);

//   /* ── toast ── */
//   const toast$=useCallback((msg,type="info")=>{
//     setToast({msg,type});
//     setTimeout(()=>setToast(null),3200);
//   },[]);

//   /* ── fetch streams every 6s ── */
//   const fetchStreams=useCallback(async()=>{
//     try{
//       const q=new Parse.Query("Streaming");
//       q.equalTo("streaming",true);
//       q.descending("createdAt");
//       q.limit(200);
//       setStreams(await q.find({useMasterKey:true}));
//     }catch(e){console.error(e);}
//   },[]);
//   useEffect(()=>{
//     fetchStreams();
//     const t=setInterval(fetchStreams,6000);
//     return()=>clearInterval(t);
//   },[fetchStreams]);

//   /* ── fetch comments ── */
//   const fetchComments=useCallback(async(roomId)=>{
//     if(!roomId) return;
//     setCmtLoading(true);
//     try{
//       const q=new Parse.Query("SteamingComments");
//       q.equalTo("room_id",roomId);
//       q.descending("sendAt");
//       q.limit(80);
//       const res=await q.find({useMasterKey:true});
//       setComments(res.map(c=>({
//         id:    c.id,
//         msg:   c.get("message")   ||"",
//         name:  c.get("name")      ||"Anonymous",
//         image: c.get("image")     ||null,
//         level: c.get("UserLevel") ||0,
//         at:    c.get("sendAt")    ||c.createdAt,
//       })).reverse());
//     }catch(e){console.error(e);}
//     finally{setCmtLoading(false);}
//   },[]);
//   useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[comments]);

//   /* ── video routing ── */
//   useEffect(()=>{
//     if(!viewer) return;
//     const elId = minimized?"lv-video-mini":"lv-video-player";
//     const target = spotUid
//       ? remoteUsers.find(u=>u.uid===spotUid && u.videoTrack)
//       : remoteUsers.find(u=>u.videoTrack);
//     if(!target?.videoTrack) return;
//     const el = document.getElementById(elId);
//     if(el) target.videoTrack.play(el);
//   },[remoteUsers, viewer, minimized, spotUid]);

//   /* ── leave (internal, no modal) ── */
//   const leaveInternal=useCallback(async(currentRemoteUsers)=>{
//     clearInterval(cmtTimer.current);
//     try{
//       if(clientRef.current){
//         (currentRemoteUsers||[]).forEach(u=>{ u.videoTrack?.stop(); u.audioTrack?.stop(); });
//         await clientRef.current.leave();
//       }
//     }catch(e){console.error(e);}
//     clientRef.current=null;
//   },[]);

//   /* ── leave (full reset, used by UI) ── */
//   const leave=useCallback(async()=>{
//     await leaveInternal(remoteUsers);
//     setRemoteUsers([]); setViewer(null);   setSpotUid(null);
//     setJoining(false);  setVCount(0);      setComments([]);
//     setMuted(false);    setMinimized(false); setLeaveModal(false);
//     mutedRef.current=false;
//   },[remoteUsers, leaveInternal]);

//   /* ── mute ── */
//   const toggleMute=useCallback(()=>{
//     const next=!mutedRef.current;
//     mutedRef.current=next;
//     remoteUsers.forEach(u=>{ if(u.audioTrack) u.audioTrack.setVolume(next?0:100); });
//     setMuted(next);
//   },[remoteUsers]);

//   /* ══════════════════════════════════════════════════════
//      JOIN — auto-leave minimized stream before joining new
//   ══════════════════════════════════════════════════════ */
//   const joinStream=async(item)=>{
//     if(joining) return;

//     /* ── AUTO-LEAVE if a stream is currently minimized ── */
//     if(viewer && minimized){
//       /* Capture current remote users before clearing state */
//       const prevRemote = remoteUsersRef.current;
//       /* Leave old stream silently */
//       await leaveInternal(prevRemote);
//       /* Reset all viewer state immediately */
//       setRemoteUsers([]);
//       setViewer(null);
//       setSpotUid(null);
//       setVCount(0);
//       setComments([]);
//       setMuted(false);
//       setMinimized(false);
//       mutedRef.current = false;
//       /* Small delay to let React flush before joining new */
//       await new Promise(r=>setTimeout(r,100));
//     }

//     setJoining(true);
//     setViewer(item);
//     setMinimized(false);
//     setTab("comments");
//     setSpotUid(null);

//     const channel=item.get("streaming_channel");
//     const uid=uidRef.current;
//     const roomId=item.id;

//     fetchComments(roomId);
//     clearInterval(cmtTimer.current);
//     cmtTimer.current=setInterval(()=>fetchComments(roomId),5000);

//     try{
//       let appId="0f433156502f450597d37a18512aac65", token=null;
//       try{
//         // const res=await Parse.Cloud.run("generateAgoraToken",{channelName:channel,uid});
//         const res = await Parse.Cloud.run("generateAgoraToken", { channelName: channel, uid }, { useMasterKey: true });
//         if(res&&typeof res==="object"){
//           token=res.token||res.Token||res.accessToken||null;
//           appId=res.appId||res.AppId||res.app_id||appId;
//         } else if(typeof res==="string"&&res.length>10) token=res;
//       }catch(cfErr){console.warn("CF:",cfErr.message);}
//       if(!token) throw new Error("No token returned. Check AgoraAppID/AgoraAppCertificate.");

//       const client=AgoraRTC.createClient({mode:"live",codec:"vp8"});
//       clientRef.current=client;
//       await client.setClientRole("audience");

//       client.on("user-published", async(user, mediaType)=>{
//         await client.subscribe(user, mediaType);

//         if(mediaType==="audio"){
//           user.audioTrack?.play();
//           if(mutedRef.current && user.audioTrack) user.audioTrack.setVolume(0);
//         }

//         if(mediaType==="video"){
//           requestAnimationFrame(()=>{
//             const elId = minimizedRef.current?"lv-video-mini":"lv-video-player";
//             const el   = document.getElementById(elId);
//             if(el && user.videoTrack) user.videoTrack.play(el);
//           });
//         }

//         setRemoteUsers(prev=>{
//           const exists=prev.find(u=>u.uid===user.uid);
//           if(exists) return [...prev];
//           return [...prev, user];
//         });
//       });

//       client.on("user-unpublished",()=>{
//         setRemoteUsers(prev=>[...prev]);
//       });

//       client.on("user-left",user=>{
//         setRemoteUsers(prev=>prev.filter(u=>u.uid!==user.uid));
//         setSpotUid(prev=>prev===user.uid?null:prev);
//       });

//       client.on("user-joined",()=>setVCount(c=>c+1));

//       await client.join(appId,channel,token,uid);
//       setJoining(false);
//       toast$("Joined stream!","success");

//     }catch(err){
//       console.error(err);
//       toast$("Join failed: "+err.message,"error");
//       leave();
//     }
//   };

//   /* ── cut single stream ── */
//   const cutStream=async()=>{
//     if(!cutModal) return;
//     const item=cutModal;
//     setCutModal(null);
//     try{
//       const obj=await new Parse.Query("Streaming").get(item.id,{useMasterKey:true});
//       obj.set("streaming",false);
//       await obj.save(null,{useMasterKey:true});
//       toast$(`Stream cut: ${item.get("username")||"unknown"}`,"success");
//       if(viewer?.id===item.id) leave();
//       fetchStreams();
//     }catch(err){ toast$("Cut failed: "+err.message,"error"); }
//   };

//   /* ══════════════════════════════════════════════════════
//      CUT ALL — calls Parse Cloud Function deleteAllStreamingData
//      For type-specific cuts: manually set streaming=false per type
//   ══════════════════════════════════════════════════════ */
//   const doCutAll=async()=>{
//     if(!cutAllModal) return;
//     const type = cutAllModal; // "ALL" | "audio" | "video" | "multi"
//     setCutAllLoading(true);
//     try{
//       if(type==="ALL"){
//         /* Use the cloud function for full wipe */
//         const res = await Parse.Cloud.run("deleteAllStreamingData");
//         const deleted = res?.deleted || res?.result?.deleted || {};
//         const streamCount = deleted.streaming || 0;
//         toast$(`Cut all streams! ${streamCount} rooms cleared.`,"success");
//       } else {
//         /* Type-specific: query and bulk-update only matching type */
//         const q = new Parse.Query("Streaming");
//         q.equalTo("streaming", true);
//         q.equalTo("party_type", type);
//         q.limit(500);
//         const items = await q.find({useMasterKey:true});
//         await Promise.all(items.map(obj=>{
//           obj.set("streaming",false);
//           return obj.save(null,{useMasterKey:true});
//         }));
//         toast$(`Cut all ${type} streams! ${items.length} rooms cleared.`,"success");
//       }
//       /* If current viewer was of this type (or ALL), leave */
//       if(type==="ALL" || (viewer && viewer.get("party_type")===type)){
//         leave();
//       }
//       fetchStreams();
//     }catch(err){
//       console.error(err);
//       toast$("Cut all failed: "+err.message,"error");
//     }finally{
//       setCutAllLoading(false);
//       setCutAllModal(null);
//     }
//   };

//   /* ── leave modal actions ── */
//   const doLeave    = ()=>{ setLeaveModal(false); leave(); };
//   const doMinimize = ()=>{ setLeaveModal(false); setMinimized(true); };
//   const doRestore  = ()=>setMinimized(false);

//   /* ── 3D card tilt ── */
//   const on3D=(e)=>{
//     const el=e.currentTarget;
//     const r=el.getBoundingClientRect();
//     const x=((e.clientX-r.left)/r.width -0.5)*14;
//     const y=((e.clientY-r.top) /r.height-0.5)*14;
//     el.style.transform=`perspective(700px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-6px) scale(1.02)`;
//   };
//   const off3D=(e)=>{ e.currentTarget.style.transform=""; };

//   /* ── seat generator ── */
//   const genSeats=()=>{
//     if(!viewer) return null;
//     const n=viewer.get("number_of_chairs")||8;
//     const cohosts=viewer.get("cohost_list")||[];
//     return Array.from({length:n},(_,i)=>{
//       const u=cohosts.find(c=>c.seatIndex===i);
//       return(
//         <div key={i} className="seat">
//           {u
//             ?<img src={u.image} alt={u.name}/>
//             :<div className="empty-seat">
//               <img src={emptySeatImg} alt="empty" className="empty-seat-img"/>
//             </div>
//           }
//         </div>
//       );
//     });
//   };

//   /* ── filter + paginate ── */
//   const filtered=streams.filter(i=>{
//     const ok=filter==="ALL"||i.get("party_type")===filter;
//     const q=search.toLowerCase();
//     const srch=!q
//       ||(i.get("username")||"").toLowerCase().includes(q)
//       ||(i.get("audio_room_title")||"").toLowerCase().includes(q);
//     return ok&&srch;
//   });
//   const totalPages   = Math.ceil(filtered.length/PER_PAGE);
//   const pageItems    = filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE);
//   const totalViewers = streams.reduce((s,i)=>(i.get("joined_users")||[]).length+s,0);
//   const totalDiamonds= streams.reduce((s,i)=>(i.get("streaming_diamonds")||0)+s,0);

//   /* ── count per type for Cut All buttons ── */
//   const countByType = (t) => t==="ALL" ? streams.length : streams.filter(i=>i.get("party_type")===t).length;

//   /* ── derived viewer values ── */
//   const hostImg   = imgUrl(viewer?.get("image"));
//   const hostName  = viewer?.get("username") || "Live Stream";
//   const hasVideo  = remoteUsers.some(u=>u.videoTrack);
//   const partyType = viewer?.get("party_type") || "audio";

//   /* ── Cut All modal label helper ── */
//   const cutAllLabel = cutAllModal==="ALL"
//     ? `ALL ${countByType("ALL")} streams`
//     : `all ${cutAllModal} streams (${countByType(cutAllModal)})`;

//   /* ═══════════════════════════════════════════════════════
//      RENDER
//   ═══════════════════════════════════════════════════════ */
//   return(
//     <div className="ls-root">

//       {/* Animated background */}
//       <div className="ls-bg" aria-hidden="true">
//         <div className="ls-bg-b1"/><div className="ls-bg-b2"/><div className="ls-bg-b3"/>
//         <div className="ls-bg-grid"/>
//       </div>

//       {/* Toast */}
//       {toast&&(
//         <div className={`ls-toast ls-toast--${toast.type}`}>
//           <span className="ls-toast-dot"/>{toast.msg}
//         </div>
//       )}

//       {/* ══ LEAVE MODAL ══ */}
//       {leaveModal&&viewer&&(
//         <div className="ls-overlay ls-overlay--leave" onClick={()=>setLeaveModal(false)}>
//           <div className="ls-lm" onClick={e=>e.stopPropagation()}>
//             <div className="ls-lm-glow"/>
//             <div className="ls-lm-preview">
//               <div className="ls-lm-av-ring">
//                 <div className="ls-lm-av">{ini(viewer.get("username")||"?")}</div>
//               </div>
//               <div className="ls-lm-info">
//                 <p className="ls-lm-name">{viewer.get("username")||"Live Stream"}</p>
//                 <p className="ls-lm-meta">{viewer.get("party_type")} · {hhmm(viewer.createdAt)}</p>
//               </div>
//               <span className="ls-lm-live-badge">
//                 <span className="ls-lm-live-pulse"/>LIVE
//               </span>
//             </div>
//             <h3 className="ls-lm-title">What would you like to do?</h3>
//             <p className="ls-lm-sub">The stream is still playing</p>
//             <div className="ls-lm-opts">
//               <button className="ls-lm-opt ls-lm-opt--min" onClick={doMinimize}>
//                 <div className="ls-lm-opt-ico-wrap ls-lm-opt-ico-wrap--min">
//                   <span className="ls-lm-opt-ico">⊟</span>
//                 </div>
//                 <div>
//                   <p className="ls-lm-opt-ttl">Minimize</p>
//                   <p className="ls-lm-opt-desc">Keep playing in a floating window</p>
//                 </div>
//                 <span className="ls-lm-opt-arr">›</span>
//               </button>
//               <button className="ls-lm-opt ls-lm-opt--leave" onClick={doLeave}>
//                 <div className="ls-lm-opt-ico-wrap ls-lm-opt-ico-wrap--leave">
//                   <span className="ls-lm-opt-ico">✕</span>
//                 </div>
//                 <div>
//                   <p className="ls-lm-opt-ttl">Leave Stream</p>
//                   <p className="ls-lm-opt-desc">Disconnect and stop audio/video</p>
//                 </div>
//                 <span className="ls-lm-opt-arr">›</span>
//               </button>
//             </div>
//             <button className="ls-lm-cancel" onClick={()=>setLeaveModal(false)}>
//               Cancel — Stay in stream
//             </button>
//           </div>
//         </div>
//       )}

//       {/* ══ CUT SINGLE MODAL ══ */}
//       {cutModal&&(
//         <div className="ls-overlay ls-overlay--modal" onClick={()=>setCutModal(null)}>
//           <div className="ls-cut-modal" onClick={e=>e.stopPropagation()}>
//             <div className="ls-cut-icon">⊘</div>
//             <h3 className="ls-cut-title">Cut Stream</h3>
//             <p className="ls-cut-desc">
//               Force-stop <strong>{cutModal.get("username")||"this"}'s</strong> stream?
//               They will be disconnected immediately.
//             </p>
//             <div className="ls-cut-btns">
//               <button className="ls-btn ls-btn--ghost" onClick={()=>setCutModal(null)}>Cancel</button>
//               <button className="ls-btn ls-btn--red" onClick={cutStream}>✕ Cut Stream</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ══ CUT ALL MODAL ══ */}
//       {cutAllModal&&(
//         <div className="ls-overlay ls-overlay--modal" onClick={()=>!cutAllLoading&&setCutAllModal(null)}>
//           <div className="ls-cut-modal" onClick={e=>e.stopPropagation()}>
//             <div className="ls-cut-icon" style={{fontSize:"2rem"}}>⚡</div>
//             <h3 className="ls-cut-title">Cut All Streams</h3>
//             <p className="ls-cut-desc">
//               This will permanently force-stop{" "}
//               <strong>{cutAllLabel}</strong>.
//               All hosts and viewers will be disconnected immediately. This cannot be undone.
//             </p>
//             <div className="ls-cut-btns">
//               <button
//                 className="ls-btn ls-btn--ghost"
//                 onClick={()=>setCutAllModal(null)}
//                 disabled={cutAllLoading}>
//                 Cancel
//               </button>
//               <button
//                 className="ls-btn ls-btn--red"
//                 onClick={doCutAll}
//                 disabled={cutAllLoading}
//                 style={{minWidth:140}}>
//                 {cutAllLoading
//                   ?<><span className="ls-spin" style={{marginRight:6}}/>Cutting…</>
//                   :"⚡ Cut All Now"
//                 }
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ══════ STREAM GRID ══════ */}
//       <div className={`ls-page${viewer&&!minimized?" ls-page--hidden":""}`}>

//         {/* Header */}
//         <div className="ls-header">
//           <div className="ls-header-left">
//             <div className="ls-live-dot"/>
//             <div>
//               <h1 className="ls-title">Live Streams</h1>
//               <p className="ls-subtitle">Real-time broadcast monitor</p>
//             </div>
//             <div className="ls-badge-wrap">
//               <span className="ls-badge-num">{streams.length}</span>
//               <span className="ls-badge-lbl">LIVE</span>
//             </div>
//           </div>
//           <div className="ls-header-right">
//             <div className="ls-search-wrap">
//               <span className="ls-search-ico">⌕</span>
//               <input className="ls-search" placeholder="Search host or title…"
//                 value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/>
//               {search&&<button className="ls-search-x" onClick={()=>{setSearch("");setPage(0);}}>✕</button>}
//             </div>
//             <button className="ls-icon-btn" onClick={fetchStreams} title="Refresh">↻</button>
//           </div>
//         </div>

//         {/* Stats */}
//         <div className="ls-stats">
//           <div className="ls-stat">
//             <div className="ls-stat-ico-wrap" style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.25)"}}>
//               <span style={{color:"#ef4444"}}>●</span>
//             </div>
//             <div><p className="ls-stat-val">{streams.length}</p><p className="ls-stat-lbl">Live Now</p></div>
//           </div>
//           <div className="ls-stat-div"/>
//           <div className="ls-stat">
//             <div className="ls-stat-ico-wrap" style={{background:"rgba(59,130,246,.12)",border:"1px solid rgba(59,130,246,.25)"}}>
//               <span style={{color:"#60a5fa"}}>👁</span>
//             </div>
//             <div><p className="ls-stat-val">{fmt(totalViewers)}</p><p className="ls-stat-lbl">Watching</p></div>
//           </div>
//           <div className="ls-stat-div"/>
//           <div className="ls-stat">
//             <div className="ls-stat-ico-wrap" style={{background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.25)"}}>
//               <span style={{color:"#fbbf24"}}>💎</span>
//             </div>
//             <div><p className="ls-stat-val">{fmt(totalDiamonds)}</p><p className="ls-stat-lbl">Diamonds</p></div>
//           </div>
//         </div>

//         {/* Filter tabs */}
//         <div className="ls-tabs">
//           {FILTERS.map(f=>(
//             <button key={f.key} className={`ls-tab${filter===f.key?" on":""}`}
//               onClick={()=>{setFilter(f.key);setPage(0);}}>
//               <span className="ls-tab-ico">{f.icon}</span>{f.label}
//               <span className="ls-tab-ct">
//                 {f.key==="ALL"?streams.length:streams.filter(i=>i.get("party_type")===f.key).length}
//               </span>
//             </button>
//           ))}
//           <span className="ls-tab-info">{filtered.length} result{filtered.length!==1?"s":""}</span>
//         </div>

//         {/* ══════════════════════════════════════════════════
//             CUT ALL BUTTONS ROW
//             Shows per-type cut buttons for audio, video, multi
//             and one "Cut All" button. Only shows types that have streams.
//         ══════════════════════════════════════════════════ */}
//         {streams.length>0&&(
//           <div className="ls-cutall-bar">
//             <span className="ls-cutall-label">⚡ Force Stop:</span>
//             {/* Audio */}
//             {countByType("audio")>0&&(
//               <button
//                 className="ls-cutall-btn ls-cutall-btn--audio"
//                 onClick={()=>setCutAllModal("audio")}
//                 title={`Cut all ${countByType("audio")} audio streams`}>
//                 ♬ Audio <span className="ls-cutall-ct">{countByType("audio")}</span>
//               </button>
//             )}
//             {/* Video */}
//             {countByType("video")>0&&(
//               <button
//                 className="ls-cutall-btn ls-cutall-btn--video"
//                 onClick={()=>setCutAllModal("video")}
//                 title={`Cut all ${countByType("video")} video streams`}>
//                 ▶ Video <span className="ls-cutall-ct">{countByType("video")}</span>
//               </button>
//             )}
//             {/* Multi */}
//             {countByType("multi")>0&&(
//               <button
//                 className="ls-cutall-btn ls-cutall-btn--multi"
//                 onClick={()=>setCutAllModal("multi")}
//                 title={`Cut all ${countByType("multi")} multi streams`}>
//                 ⊞ Multi <span className="ls-cutall-ct">{countByType("multi")}</span>
//               </button>
//             )}
//             {/* Cut ALL */}
//             <button
//               className="ls-cutall-btn ls-cutall-btn--all"
//               onClick={()=>setCutAllModal("ALL")}
//               title={`Cut all ${streams.length} streams`}>
//               ⊘ Cut ALL <span className="ls-cutall-ct">{streams.length}</span>
//             </button>
//           </div>
//         )}

//         {/* Grid */}
//         <div className="ls-grid-wrap">
//           {pageItems.length===0?(
//             <div className="ls-empty">
//               <div className="ls-empty-glow"/>
//               <div className="ls-empty-icon">📡</div>
//               <p className="ls-empty-ttl">No live streams right now</p>
//               <small>Try a different filter or refresh</small>
//             </div>
//           ):(
//             <div className="ls-grid">
//               {pageItems.map((item,idx)=>{
//                 const name    =item.get("username")         ||"Anonymous";
//                 const img     =imgUrl(item.get("image"));
//                 const type    =item.get("party_type")       ||"audio";
//                 const viewers =(item.get("joined_users")||[]).length;
//                 const title   =item.get("audio_room_title")||item.get("title")||name+"'s Stream";
//                 const diamonds=item.get("streaming_diamonds")||0;
//                 const col     =tc(type);
//                 return(
//                   <div key={item.id} className="ls-card"
//                     style={{animationDelay:`${idx*40}ms`}}
//                     onMouseMove={on3D} onMouseLeave={off3D}>
//                     <div className="ls-thumb" onClick={()=>joinStream(item)}>
//                       {img
//                         ?<img src={img} alt={name} className="ls-thumb-img"/>
//                         :<div className={`ls-thumb-ph ls-thumb-ph--${type}`}>
//                           <div className="ls-thumb-ph-inner">
//                             {type==="audio"&&(
//                               <div className="ls-ph-waves">
//                                 {[...Array(5)].map((_,i)=>(
//                                   <div key={i} className="ls-ph-wave" style={{animationDelay:`${i*.15}s`}}/>
//                                 ))}
//                               </div>
//                             )}
//                             <span className="ls-ph-glyph">{glyph(type)}</span>
//                           </div>
//                         </div>
//                       }
//                       <div className="ls-thumb-overlay"/>
//                       {img&&(
//                         <div className="ls-thumb-host-av">
//                           <div className="ls-thumb-av-ring">
//                             <div className="ls-thumb-av">{ini(name)}</div>
//                           </div>
//                         </div>
//                       )}
//                       <div className="ls-live-badge">
//                         <span className="ls-live-pulse"/><span>LIVE</span>
//                       </div>
//                       <span className="ls-type-badge"
//                         style={{background:col.bg,borderColor:col.bd,color:col.tx}}>
//                         {glyph(type)}&nbsp;{type}
//                       </span>
//                       <div className="ls-thumb-stats">
//                         <span className="ls-stat-pill">👁&nbsp;{viewers}</span>
//                         {diamonds>0&&<span className="ls-stat-pill ls-stat-pill--gold">💎&nbsp;{fmt(diamonds)}</span>}
//                       </div>
//                     </div>
//                     <div className="ls-card-body">
//                       <div className="ls-card-host">
//                         <div className="ls-av-ring">
//                           {img
//                             ?<img src={img} alt={name} className="ls-av-img"/>
//                             :<div className="ls-av">{ini(name)}</div>
//                           }
//                         </div>
//                         <div className="ls-card-meta">
//                           <p className="ls-card-name">{name}</p>
//                           <p className="ls-card-when">{hhmm(item.createdAt)}</p>
//                         </div>
//                         <span className="ls-card-type-dot"
//                           style={{background:col.tx,boxShadow:`0 0 6px ${col.tx}`}}/>
//                       </div>
//                       <p className="ls-card-ttl" title={title}>{title}</p>
//                       <div className="ls-card-foot">
//                         <button className={`ls-watch-btn ls-watch-btn--${type}`}
//                           onClick={()=>joinStream(item)} disabled={joining}>
//                           {joining?<span className="ls-spin"/>
//                             :<><span className="ls-watch-ico">{glyph(type)}</span>
//                               {type==="audio"?"Listen Now":"Watch Now"}</>
//                           }
//                         </button>
//                         <button className="ls-cut-btn" title="Cut stream"
//                           onClick={()=>setCutModal(item)}>⊘</button>
//                       </div>
//                     </div>
//                     <div className="ls-card-shine"/>
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//           {totalPages>1&&(
//             <div className="ls-pages">
//               <button className="ls-pg" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</button>
//               {Array.from({length:totalPages},(_,i)=>(
//                 <button key={i} className={`ls-pg${page===i?" on":""}`} onClick={()=>setPage(i)}>{i+1}</button>
//               ))}
//               <button className="ls-pg" disabled={page===totalPages-1} onClick={()=>setPage(p=>p+1)}>›</button>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* ══════ FULL VIEWER ══════ */}
//       {viewer&&!minimized&&(
//         <div className="ls-viewer">
//           <div className="ls-vnav">
//             <div className="ls-vnav-left">
//               <button className="ls-back" onClick={()=>setLeaveModal(true)}>← Back</button>
//               <div className="ls-vhost">
//                 <span className="ls-vpulse"/>
//                 <div className="ls-vav">{ini(hostName)}</div>
//                 <div>
//                   <p className="ls-vname">{hostName}</p>
//                   <p className="ls-vmeta">{partyType} · {(viewer.get("joined_users")||[]).length} in room</p>
//                 </div>
//               </div>
//             </div>
//             <div className="ls-vnav-right">
//               <span className="ls-vct">👁 {vCount+remoteUsers.length}</span>
//               <button className="ls-cut-nav" onClick={()=>setCutModal(viewer)}>⊘ Cut</button>
//               <button className="ls-leave-btn" onClick={()=>setLeaveModal(true)}>Leave ✕</button>
//             </div>
//           </div>

//           <div className="ls-vbody">
//             <div className="ls-vcol">
//               <div className="ls-vstage">
//                 {/* Layer 0 — Blurred avatar / gradient backdrop */}
//                 <div className="ls-stage-bg">
//                   {hostImg
//                     ?<img src={hostImg} alt="" className="ls-stage-bg-img"/>
//                     :<div className="ls-stage-bg-grad"/>
//                   }
//                   <div className="ls-stage-bg-tint"/>
//                 </div>

//                 {/* Layer 1 — Pure Agora target */}
//                 <div id="lv-video-player" className="ls-vinner"/>

//                 {/* Layer 2 — Content overlay */}
//                 {!hasVideo&&(
//                   <div className="ls-stage-fg">
//                     {partyType==="audio"
//                       ?<div className="seat-container">{genSeats()}</div>
//                       :(
//                         <div className="ls-stage-load">
//                           <div className="ls-stage-hero-wrap">
//                             <div className="ls-stage-hero-ring"/>
//                             {hostImg
//                               ?<img src={hostImg} alt={hostName} className="ls-stage-hero-img"/>
//                               :<div className="ls-stage-hero-av">{ini(hostName)}</div>
//                             }
//                           </div>
//                           <p className="ls-stage-hero-name">{hostName}</p>
//                           <div className="ls-stage-load-pill">
//                             <span className="ls-spin"/>
//                             <span>Connecting video stream…</span>
//                           </div>
//                         </div>
//                       )
//                     }
//                   </div>
//                 )}
//               </div>

//               {remoteUsers.length>1&&(
//                 <div className="ls-strip">
//                   {remoteUsers.map(u=>(
//                     <div key={u.uid}
//                       className={`ls-strip-item${spotUid===u.uid?" on":""}`}
//                       onClick={()=>setSpotUid(u.uid)}>
//                       <div className="ls-strip-ico">{u.videoTrack?"📷":"♬"}</div>
//                       <span className="ls-strip-lbl">…{String(u.uid).slice(-4)}</span>
//                     </div>
//                   ))}
//                 </div>
//               )}

//               <div className="ls-ctrls">
//                 <button className={`ls-ctrl${muted?" on":""}`} onClick={toggleMute}>
//                   <span>{muted?"🔇":"🔊"}</span><small>{muted?"Unmute":"Mute"}</small>
//                 </button>
//                 <button className="ls-ctrl" onClick={()=>setLeaveModal(true)}>
//                   <span>⊟</span><small>Minimize</small>
//                 </button>
//                 <button className="ls-ctrl ls-ctrl--red" onClick={()=>setLeaveModal(true)}>
//                   <span>📞</span><small>Leave</small>
//                 </button>
//               </div>
//             </div>

//             <aside className="ls-sidebar">
//               <div className="ls-stabs">
//                 <button className={`ls-stab${tab==="comments"?" on":""}`}
//                   onClick={()=>setTab("comments")}>
//                   💬 Comments
//                   {comments.length>0&&<span className="ls-cbadge">{comments.length}</span>}
//                 </button>
//                 <button className={`ls-stab${tab==="info"?" on":""}`}
//                   onClick={()=>setTab("info")}>ℹ Info</button>
//               </div>

//               {tab==="comments"&&(
//                 <div className="ls-cmt-wrap">
//                   {cmtLoading&&comments.length===0?(
//                     <div className="ls-cmt-load"><span className="ls-spin"/>Loading…</div>
//                   ):comments.length===0?(
//                     <div className="ls-cmt-empty"><span>💬</span><p>No comments yet</p></div>
//                   ):(
//                     <div className="ls-cmt-list">
//                       {comments.map(c=>(
//                         <div key={c.id} className={`ls-cmt${c.msg==="Joined the Room"?" ls-cmt--join":""}`}>
//                           <div className="ls-cmt-av-wrap">
//                             {c.image
//                               ?<img src={c.image} alt={c.name} className="ls-cmt-av"/>
//                               :<div className="ls-cmt-av ls-cmt-av--ini">{ini(c.name)}</div>
//                             }
//                             {c.level>0&&<span className="ls-cmt-lv">Lv{c.level}</span>}
//                           </div>
//                           <div className="ls-cmt-body">
//                             <div className="ls-cmt-row">
//                               <span className="ls-cmt-name">{c.name}</span>
//                               <span className="ls-cmt-time">{ago(c.at)}</span>
//                             </div>
//                             <p className="ls-cmt-msg">{c.msg}</p>
//                           </div>
//                         </div>
//                       ))}
//                       <div ref={chatEnd}/>
//                     </div>
//                   )}
//                 </div>
//               )}

//               {tab==="info"&&(
//                 <div className="ls-info-wrap">
//                   <div className="ls-info-sec">
//                     <p className="ls-info-lbl">Stream Info</p>
//                     {[
//                       ["Channel",  viewer.get("streaming_channel")||"—"],
//                       ["Type",     partyType],
//                       ["Title",    viewer.get("audio_room_title")||viewer.get("title")||"—"],
//                       ["Host",     hostName],
//                       ["Diamonds", fmt(viewer.get("streaming_diamonds")||0)+" 💎"],
//                       ["In Room",  (viewer.get("joined_users")||[]).length],
//                       ["Started",  hhmm(viewer.createdAt)],
//                     ].map(([k,v],i)=>(
//                       <div key={i} className="ls-info-row">
//                         <span className="ls-info-k">{k}</span>
//                         <span className="ls-info-v">{v}</span>
//                       </div>
//                     ))}
//                   </div>
//                   <div className="ls-info-sec">
//                     <p className="ls-info-lbl">People in Room</p>
//                     {(viewer.get("joined_users")||[]).map((u,i)=>(
//                       <div key={i} className="ls-person">
//                         {u.image
//                           ?<img src={u.image} alt={u.name} className="ls-person-av"/>
//                           :<div className="ls-person-av ls-person-av--ini">{ini(u.name)}</div>
//                         }
//                         <div className="ls-person-info">
//                           <span className="ls-person-name">{u.name}</span>
//                           <span className="ls-person-uid">uid: {u.uid}</span>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </aside>
//           </div>
//         </div>
//       )}

//       {/* ══════ MINI PLAYER ══════ */}
//       {viewer&&minimized&&(
//         <div className="ls-mini">
//           <div className="ls-mini-glow"/>
//           <div id="lv-video-mini"
//             className={`ls-mini-stage${hasVideo?"":" ls-mini-stage--audio"}`}>
//             {!hasVideo&&(
//               <div className="ls-mini-audio">
//                 {hostImg
//                   ?<img src={hostImg} alt={hostName} className="ls-mini-host-img"/>
//                   :<div className="ls-mini-av">{ini(hostName)}</div>
//                 }
//                 <div className="ls-mini-eq">
//                   {[...Array(5)].map((_,i)=>(
//                     <div key={i} className="ls-mini-eq-bar" style={{animationDelay:`${i*.11}s`}}/>
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//           <div className="ls-mini-foot">
//             <div className="ls-mini-left">
//               <span className="ls-mini-live"/>
//               <div>
//                 <p className="ls-mini-name">{hostName}</p>
//                 <p className="ls-mini-meta">👁 {vCount+remoteUsers.length}</p>
//               </div>
//             </div>
//             <div className="ls-mini-ctrls">
//               <button className={`ls-mini-btn${muted?" ls-mini-btn--on":""}`}
//                 onClick={toggleMute} title={muted?"Unmute":"Mute"}>
//                 {muted?"🔇":"🔊"}
//               </button>
//               <button className="ls-mini-btn" onClick={doRestore} title="Restore">⤢</button>
//               <button className="ls-mini-btn ls-mini-btn--red"
//                 onClick={()=>setLeaveModal(true)} title="Leave">✕</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Joining loader */}
//       {joining&&(
//         <div className="ls-overlay ls-overlay--load">
//           <div className="ls-load-card">
//             <div className="ls-load-rings">
//               <div className="ls-ring r1"/><div className="ls-ring r2"/><div className="ls-ring r3"/>
//             </div>
//             <p>Connecting to stream…</p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

























import React, { useEffect, useState, useRef, useCallback } from "react";
import Parse from "../../parseConfig";
import "./Streaming.css";
import emptySeatImg from "../../assets/seat_mic.png";
import { useStreaming } from "./StreamingContext"; // ← global context

const PER_PAGE = 12;
const FILTERS  = [
  { key:"ALL",   label:"All",   icon:"◈" },
  { key:"audio", label:"Audio", icon:"♬" },
  { key:"video", label:"Video", icon:"▶" },
  { key:"multi", label:"Multi", icon:"⊞" },
];

function tc(t){
  if(t==="video") return{bg:"rgba(59,130,246,.15)",  bd:"rgba(59,130,246,.45)",  tx:"#60a5fa"};
  if(t==="audio") return{bg:"rgba(129,140,248,.15)", bd:"rgba(129,140,248,.45)", tx:"#a5b4fc"};
  if(t==="multi") return{bg:"rgba(6,182,212,.15)",   bd:"rgba(6,182,212,.45)",   tx:"#22d3ee"};
  return               {bg:"rgba(148,163,184,.12)", bd:"rgba(148,163,184,.3)",  tx:"#94a3b8"};
}
function glyph(t){ return t==="video"?"▶":t==="audio"?"♬":t==="multi"?"⊞":"◈"; }
function ini(n=""){ return(n||"").trim().split(/\s+/).map(w=>w[0]||"").join("").toUpperCase().slice(0,2)||"?"; }
function imgUrl(v){
  if(!v) return "";
  if(typeof v==="string") return v;
  if(typeof v.url==="function") return v.url();
  if(v.url) return v.url;
  return "";
}
function ago(d){
  if(!d) return "";
  const s=Math.floor((Date.now()-new Date(d))/1000);
  if(s<60)   return`${s}s ago`;
  if(s<3600) return`${Math.floor(s/60)}m ago`;
  return`${Math.floor(s/3600)}h ago`;
}
function hhmm(d){
  if(!d) return "";
  return new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
}
function fmt(n){
  if(n>=1e6) return(n/1e6).toFixed(1)+"M";
  if(n>=1e3) return(n/1e3).toFixed(1)+"K";
  return String(n||0);
}

export default function LiveStreaming(){
  /* ── global streaming state ── */
  const {
    viewer, remoteUsers, joining, muted, minimized, vCount, hasVideo,
    joinStream, leave, toggleMute, setMinimized,
  } = useStreaming();

  /* ── local page state ── */
  const [streams,      setStreams]      = useState([]);
  const [filter,       setFilter]       = useState("ALL");
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(0);
  const [toast,        setToast]        = useState(null);
  const [spotUid,      setSpotUid]      = useState(null);
  const [comments,     setComments]     = useState([]);
  const [cmtLoading,   setCmtLoading]   = useState(false);
  const [tab,          setTab]          = useState("comments");
  const [cutModal,     setCutModal]     = useState(null);
  const [leaveModal,   setLeaveModal]   = useState(false);

  /* ── Cut All state ── */
  const [cutAllModal,   setCutAllModal]   = useState(null); // null | "ALL" | "audio" | "video" | "multi"
  const [cutAllLoading, setCutAllLoading] = useState(false);

  const chatEnd  = useRef(null);
  const cmtTimer = useRef(null);

  /* ── toast helper ── */
  const toast$ = useCallback((msg,type="info")=>{
    setToast({msg,type});
    setTimeout(()=>setToast(null),3200);
  },[]);

  /* ── fetch streams ── */
  const fetchStreams = useCallback(async()=>{
    try{
      const q=new Parse.Query("Streaming");
      q.equalTo("streaming",true);
      q.descending("createdAt");
      q.limit(200);
      setStreams(await q.find({useMasterKey:true}));
    }catch(e){console.error(e);}
  },[]);

  useEffect(()=>{
    fetchStreams();
    const t=setInterval(fetchStreams,6000);
    return()=>clearInterval(t);
  },[fetchStreams]);

  /* ── fetch comments ── */
  const fetchComments = useCallback(async(roomId)=>{
    if(!roomId) return;
    setCmtLoading(true);
    try{
      const q=new Parse.Query("SteamingComments");
      q.equalTo("room_id",roomId);
      q.descending("sendAt");
      q.limit(80);
      const res=await q.find({useMasterKey:true});
      setComments(res.map(c=>({
        id:c.id, msg:c.get("message")||"", name:c.get("name")||"Anonymous",
        image:c.get("image")||null, level:c.get("UserLevel")||0,
        at:c.get("sendAt")||c.createdAt,
      })).reverse());
    }catch(e){console.error(e);}
    finally{setCmtLoading(false);}
  },[]);

  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[comments]);

  /* start comment polling when viewer changes */
  useEffect(()=>{
    clearInterval(cmtTimer.current);
    if(viewer){
      fetchComments(viewer.id);
      cmtTimer.current = setInterval(()=>fetchComments(viewer.id),5000);
    } else {
      setComments([]);
    }
    return ()=>clearInterval(cmtTimer.current);
  },[viewer, fetchComments]);

  /* reset tab/spotUid when viewer changes */
  useEffect(()=>{
    if(viewer){ setTab("comments"); setSpotUid(null); }
  },[viewer]);

  /* ── video routing (full-screen player only) ── */
  useEffect(()=>{
    if(!viewer || minimized) return;
    const target = spotUid
      ? remoteUsers.find(u=>u.uid===spotUid&&u.videoTrack)
      : remoteUsers.find(u=>u.videoTrack);
    if(!target?.videoTrack) return;
    const el = document.getElementById("lv-global-player");
    if(el) target.videoTrack.play(el);
  },[remoteUsers, viewer, minimized, spotUid]);

  /* ══════════════════════════════════════════════
     CUT ALL — FIXED
  ══════════════════════════════════════════════ */
  const doCutAll = async()=>{
    if(!cutAllModal) return;
    const type = cutAllModal;
    setCutAllLoading(true);
    try{
      if(type==="ALL"){
        /* ─── USE MASTER KEY for the cloud function ─── */
        const res = await Parse.Cloud.run(
          "deleteAllStreamingData",
          {},
          { useMasterKey: true }           // ← FIX: pass master key
        );
        const r = res?.result || res || {};
        const deleted = r.deleted || {};
        const streamCount = deleted.streaming ?? 0;
        const cmtCount    = deleted.streamingComments ?? 0;
        toast$(`✓ Cut all! ${streamCount} streams · ${cmtCount} comments cleared.`,"success");
      } else {
        /* ─── type-specific bulk update ─── */
        const q = new Parse.Query("Streaming");
        q.equalTo("streaming", true);
        if(type!=="ALL") q.equalTo("party_type", type);
        q.limit(1000);
        const items = await q.find({useMasterKey:true});

        /* batch save in chunks of 50 to avoid timeouts */
        const CHUNK = 50;
        let total = 0;
        for(let i=0; i<items.length; i+=CHUNK){
          const chunk = items.slice(i, i+CHUNK);
          chunk.forEach(obj=>obj.set("streaming",false));
          await Parse.Object.saveAll(chunk, {useMasterKey:true});
          total += chunk.length;
        }
        toast$(`✓ Cut ${total} ${type} stream${total!==1?"s":""}!`,"success");
      }
      /* leave if current viewer affected */
      if(viewer && (type==="ALL" || viewer.get("party_type")===type)){
        leave();
      }
      fetchStreams();
    }catch(err){
      console.error("CutAll error:", err);
      toast$("Cut all failed: "+err.message,"error");
    }finally{
      setCutAllLoading(false);
      setCutAllModal(null);
    }
  };

  /* ── cut single stream ── */
  const cutStream = async()=>{
    if(!cutModal) return;
    const item = cutModal;
    setCutModal(null);
    try{
      const obj=await new Parse.Query("Streaming").get(item.id,{useMasterKey:true});
      obj.set("streaming",false);
      await obj.save(null,{useMasterKey:true});
      toast$(`Stream cut: ${item.get("username")||"unknown"}`,"success");
      if(viewer?.id===item.id) leave();
      fetchStreams();
    }catch(err){ toast$("Cut failed: "+err.message,"error"); }
  };

  /* ── join wrapper ── */
  const handleJoin = (item) => joinStream(item, toast$);

  /* ── leave modal ── */
  const doLeave    = ()=>{ setLeaveModal(false); leave(); };
  const doMinimize = ()=>{ setLeaveModal(false); setMinimized(true); };
  const doRestore  = ()=>setMinimized(false);

  /* ── 3D card tilt ── */
  const on3D=(e)=>{
    const el=e.currentTarget;
    const r=el.getBoundingClientRect();
    const x=((e.clientX-r.left)/r.width -0.5)*14;
    const y=((e.clientY-r.top) /r.height-0.5)*14;
    el.style.transform=`perspective(700px) rotateY(${x}deg) rotateX(${-y}deg) translateY(-6px) scale(1.02)`;
  };
  const off3D=(e)=>{ e.currentTarget.style.transform=""; };

  /* ── seat generator ── */
  const genSeats=()=>{
    if(!viewer) return null;
    const n=viewer.get("number_of_chairs")||8;
    const cohosts=viewer.get("cohost_list")||[];
    return Array.from({length:n},(_,i)=>{
      const u=cohosts.find(c=>c.seatIndex===i);
      return(
        <div key={i} className="seat">
          {u
            ?<img src={u.image} alt={u.name}/>
            :<div className="empty-seat"><img src={emptySeatImg} alt="empty" className="empty-seat-img"/></div>
          }
        </div>
      );
    });
  };

  /* ── filter + paginate ── */
  const filtered=streams.filter(i=>{
    const ok=filter==="ALL"||i.get("party_type")===filter;
    const q=search.toLowerCase();
    const srch=!q||(i.get("username")||"").toLowerCase().includes(q)||(i.get("audio_room_title")||"").toLowerCase().includes(q);
    return ok&&srch;
  });
  const totalPages    = Math.ceil(filtered.length/PER_PAGE);
  const pageItems     = filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE);
  const totalViewers  = streams.reduce((s,i)=>(i.get("joined_users")||[]).length+s,0);
  const totalDiamonds = streams.reduce((s,i)=>(i.get("streaming_diamonds")||0)+s,0);
  const countByType   = t => t==="ALL" ? streams.length : streams.filter(i=>i.get("party_type")===t).length;

  /* ── derived viewer values ── */
  const hostImg   = imgUrl(viewer?.get("image"));
  const hostName  = viewer?.get("username") || "Live Stream";
  const partyType = viewer?.get("party_type") || "audio";

  const cutAllLabel = cutAllModal==="ALL"
    ? `ALL ${countByType("ALL")} streams`
    : `all ${cutAllModal} streams (${countByType(cutAllModal||"ALL")})`;

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return(
    <div className="ls-root">

      {/* Animated background */}
      <div className="ls-bg" aria-hidden="true">
        <div className="ls-bg-b1"/><div className="ls-bg-b2"/><div className="ls-bg-b3"/>
        <div className="ls-bg-grid"/>
      </div>

      {/* Toast */}
      {toast&&(
        <div className={`ls-toast ls-toast--${toast.type}`}>
          <span className="ls-toast-dot"/>{toast.msg}
        </div>
      )}

      {/* ══ LEAVE MODAL ══ */}
      {leaveModal&&viewer&&(
        <div className="ls-overlay ls-overlay--leave" onClick={()=>setLeaveModal(false)}>
          <div className="ls-lm" onClick={e=>e.stopPropagation()}>
            <div className="ls-lm-glow"/>
            <div className="ls-lm-preview">
              <div className="ls-lm-av-ring">
                <div className="ls-lm-av">{ini(viewer.get("username")||"?")}</div>
              </div>
              <div className="ls-lm-info">
                <p className="ls-lm-name">{viewer.get("username")||"Live Stream"}</p>
                <p className="ls-lm-meta">{viewer.get("party_type")} · {hhmm(viewer.createdAt)}</p>
              </div>
              <span className="ls-lm-live-badge"><span className="ls-lm-live-pulse"/>LIVE</span>
            </div>
            <h3 className="ls-lm-title">What would you like to do?</h3>
            <p className="ls-lm-sub">The stream is still playing</p>
            <div className="ls-lm-opts">
              <button className="ls-lm-opt ls-lm-opt--min" onClick={doMinimize}>
                <div className="ls-lm-opt-ico-wrap ls-lm-opt-ico-wrap--min"><span className="ls-lm-opt-ico">⊟</span></div>
                <div><p className="ls-lm-opt-ttl">Minimize</p><p className="ls-lm-opt-desc">Keep playing in a floating window</p></div>
                <span className="ls-lm-opt-arr">›</span>
              </button>
              <button className="ls-lm-opt ls-lm-opt--leave" onClick={doLeave}>
                <div className="ls-lm-opt-ico-wrap ls-lm-opt-ico-wrap--leave"><span className="ls-lm-opt-ico">✕</span></div>
                <div><p className="ls-lm-opt-ttl">Leave Stream</p><p className="ls-lm-opt-desc">Disconnect and stop audio/video</p></div>
                <span className="ls-lm-opt-arr">›</span>
              </button>
            </div>
            <button className="ls-lm-cancel" onClick={()=>setLeaveModal(false)}>Cancel — Stay in stream</button>
          </div>
        </div>
      )}

      {/* ══ CUT SINGLE MODAL ══ */}
      {cutModal&&(
        <div className="ls-overlay ls-overlay--modal" onClick={()=>setCutModal(null)}>
          <div className="ls-cut-modal" onClick={e=>e.stopPropagation()}>
            <div className="ls-cut-icon">⊘</div>
            <h3 className="ls-cut-title">Cut Stream</h3>
            <p className="ls-cut-desc">Force-stop <strong>{cutModal.get("username")||"this"}'s</strong> stream? They will be disconnected immediately.</p>
            <div className="ls-cut-btns">
              <button className="ls-btn ls-btn--ghost" onClick={()=>setCutModal(null)}>Cancel</button>
              <button className="ls-btn ls-btn--red" onClick={cutStream}>✕ Cut Stream</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CUT ALL MODAL ══ */}
      {cutAllModal&&(
        <div className="ls-overlay ls-overlay--modal" onClick={()=>!cutAllLoading&&setCutAllModal(null)}>
          <div className="ls-cut-modal" onClick={e=>e.stopPropagation()}>
            <div className="ls-cut-icon" style={{fontSize:"2rem",background:"rgba(239,68,68,0.12)",border:"1.5px solid rgba(239,68,68,0.35)",color:"#f87171"}}>⚡</div>
            <h3 className="ls-cut-title">Cut All Streams</h3>
            <p className="ls-cut-desc">
              This will permanently force-stop <strong>{cutAllLabel}</strong>.
              All hosts and viewers will be disconnected immediately. This cannot be undone.
            </p>
            <div className="ls-cut-btns">
              <button className="ls-btn ls-btn--ghost" onClick={()=>setCutAllModal(null)} disabled={cutAllLoading}>Cancel</button>
              <button className="ls-btn ls-btn--red" onClick={doCutAll} disabled={cutAllLoading} style={{minWidth:140}}>
                {cutAllLoading
                  ?<><span className="ls-spin" style={{marginRight:6}}/>Cutting…</>
                  :"⚡ Cut All Now"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ STREAM GRID ══════ */}
      <div className={`ls-page${viewer&&!minimized?" ls-page--hidden":""}`}>

        {/* Header */}
        <div className="ls-header">
          <div className="ls-header-left">
            <div className="ls-live-dot"/>
            <div>
              <h1 className="ls-title">Live Streams</h1>
              <p className="ls-subtitle">Real-time broadcast monitor</p>
            </div>
            <div className="ls-badge-wrap">
              <span className="ls-badge-num">{streams.length}</span>
              <span className="ls-badge-lbl">LIVE</span>
            </div>
          </div>
          <div className="ls-header-right">
            <div className="ls-search-wrap">
              <span className="ls-search-ico">⌕</span>
              <input className="ls-search" placeholder="Search host or title…"
                value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/>
              {search&&<button className="ls-search-x" onClick={()=>{setSearch("");setPage(0);}}>✕</button>}
            </div>
            <button className="ls-icon-btn" onClick={fetchStreams} title="Refresh">↻</button>
          </div>
        </div>

        {/* Stats */}
        <div className="ls-stats">
          <div className="ls-stat">
            <div className="ls-stat-ico-wrap" style={{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.25)"}}>
              <span style={{color:"#ef4444"}}>●</span>
            </div>
            <div><p className="ls-stat-val">{streams.length}</p><p className="ls-stat-lbl">Live Now</p></div>
          </div>
          <div className="ls-stat-div"/>
          <div className="ls-stat">
            <div className="ls-stat-ico-wrap" style={{background:"rgba(59,130,246,.12)",border:"1px solid rgba(59,130,246,.25)"}}>
              <span style={{color:"#60a5fa"}}>👁</span>
            </div>
            <div><p className="ls-stat-val">{fmt(totalViewers)}</p><p className="ls-stat-lbl">Watching</p></div>
          </div>
          <div className="ls-stat-div"/>
          <div className="ls-stat">
            <div className="ls-stat-ico-wrap" style={{background:"rgba(245,158,11,.12)",border:"1px solid rgba(245,158,11,.25)"}}>
              <span style={{color:"#fbbf24"}}>💎</span>
            </div>
            <div><p className="ls-stat-val">{fmt(totalDiamonds)}</p><p className="ls-stat-lbl">Diamonds</p></div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="ls-tabs">
          {FILTERS.map(f=>(
            <button key={f.key} className={`ls-tab${filter===f.key?" on":""}`}
              onClick={()=>{setFilter(f.key);setPage(0);}}>
              <span className="ls-tab-ico">{f.icon}</span>{f.label}
              <span className="ls-tab-ct">{f.key==="ALL"?streams.length:streams.filter(i=>i.get("party_type")===f.key).length}</span>
            </button>
          ))}
          <span className="ls-tab-info">{filtered.length} result{filtered.length!==1?"s":""}</span>
        </div>

        {/* ══════════════════════════════════════════════
            CUT ALL BUTTONS
        ══════════════════════════════════════════════ */}
        {streams.length>0&&(
          <div className="ls-cutall-bar">
            <span className="ls-cutall-label">⚡ Force Stop:</span>
            {countByType("audio")>0&&(
              <button className="ls-cutall-btn ls-cutall-btn--audio" onClick={()=>setCutAllModal("audio")}>
                ♬ Audio <span className="ls-cutall-ct">{countByType("audio")}</span>
              </button>
            )}
            {countByType("video")>0&&(
              <button className="ls-cutall-btn ls-cutall-btn--video" onClick={()=>setCutAllModal("video")}>
                ▶ Video <span className="ls-cutall-ct">{countByType("video")}</span>
              </button>
            )}
            {countByType("multi")>0&&(
              <button className="ls-cutall-btn ls-cutall-btn--multi" onClick={()=>setCutAllModal("multi")}>
                ⊞ Multi <span className="ls-cutall-ct">{countByType("multi")}</span>
              </button>
            )}
            <button className="ls-cutall-btn ls-cutall-btn--all" onClick={()=>setCutAllModal("ALL")}>
              ⊘ Cut ALL <span className="ls-cutall-ct">{streams.length}</span>
            </button>
          </div>
        )}

        {/* Stream Grid */}
        <div className="ls-grid-wrap">
          {pageItems.length===0?(
            <div className="ls-empty">
              <div className="ls-empty-glow"/>
              <div className="ls-empty-icon">📡</div>
              <p className="ls-empty-ttl">No live streams right now</p>
              <small>Try a different filter or refresh</small>
            </div>
          ):(
            <div className="ls-grid">
              {pageItems.map((item,idx)=>{
                const name    =item.get("username")         ||"Anonymous";
                const img     =imgUrl(item.get("image"));
                const type    =item.get("party_type")       ||"audio";
                const viewers =(item.get("joined_users")||[]).length;
                const title   =item.get("audio_room_title")||item.get("title")||name+"'s Stream";
                const diamonds=item.get("streaming_diamonds")||0;
                const col     =tc(type);
                const isWatching = viewer?.id===item.id;
                return(
                  <div key={item.id} className={`ls-card${isWatching?" ls-card--watching":""}`}
                    style={{animationDelay:`${idx*40}ms`}}
                    onMouseMove={on3D} onMouseLeave={off3D}>
                    <div className="ls-thumb" onClick={()=>handleJoin(item)}>
                      {img
                        ?<img src={img} alt={name} className="ls-thumb-img"/>
                        :<div className={`ls-thumb-ph ls-thumb-ph--${type}`}>
                          <div className="ls-thumb-ph-inner">
                            {type==="audio"&&(
                              <div className="ls-ph-waves">
                                {[...Array(5)].map((_,i)=>(
                                  <div key={i} className="ls-ph-wave" style={{animationDelay:`${i*.15}s`}}/>
                                ))}
                              </div>
                            )}
                            <span className="ls-ph-glyph">{glyph(type)}</span>
                          </div>
                        </div>
                      }
                      <div className="ls-thumb-overlay"/>
                      {img&&(
                        <div className="ls-thumb-host-av">
                          <div className="ls-thumb-av-ring"><div className="ls-thumb-av">{ini(name)}</div></div>
                        </div>
                      )}
                      <div className="ls-live-badge"><span className="ls-live-pulse"/><span>LIVE</span></div>
                      <span className="ls-type-badge" style={{background:col.bg,borderColor:col.bd,color:col.tx}}>
                        {glyph(type)}&nbsp;{type}
                      </span>
                      <div className="ls-thumb-stats">
                        <span className="ls-stat-pill">👁&nbsp;{viewers}</span>
                        {diamonds>0&&<span className="ls-stat-pill ls-stat-pill--gold">💎&nbsp;{fmt(diamonds)}</span>}
                      </div>
                    </div>
                    <div className="ls-card-body">
                      <div className="ls-card-host">
                        <div className="ls-av-ring">
                          {img?<img src={img} alt={name} className="ls-av-img"/>:<div className="ls-av">{ini(name)}</div>}
                        </div>
                        <div className="ls-card-meta">
                          <p className="ls-card-name">{name}</p>
                          <p className="ls-card-when">{hhmm(item.createdAt)}</p>
                        </div>
                        <span className="ls-card-type-dot" style={{background:col.tx,boxShadow:`0 0 6px ${col.tx}`}}/>
                      </div>
                      <p className="ls-card-ttl" title={title}>{title}</p>
                      <div className="ls-card-foot">
                        <button className={`ls-watch-btn ls-watch-btn--${type}${isWatching?" ls-watch-btn--active":""}`}
                          onClick={()=>isWatching?doRestore():handleJoin(item)} disabled={joining}>
                          {joining?<span className="ls-spin"/>
                            :isWatching?<><span className="ls-watch-ico">⤢</span>Restore</>
                            :<><span className="ls-watch-ico">{glyph(type)}</span>{type==="audio"?"Listen Now":"Watch Now"}</>
                          }
                        </button>
                        <button className="ls-cut-btn" title="Cut stream" onClick={()=>setCutModal(item)}>⊘</button>
                      </div>
                    </div>
                    <div className="ls-card-shine"/>
                  </div>
                );
              })}
            </div>
          )}
          {totalPages>1&&(
            <div className="ls-pages">
              <button className="ls-pg" disabled={page===0} onClick={()=>setPage(p=>p-1)}>‹</button>
              {Array.from({length:totalPages},(_,i)=>(
                <button key={i} className={`ls-pg${page===i?" on":""}`} onClick={()=>setPage(i)}>{i+1}</button>
              ))}
              <button className="ls-pg" disabled={page===totalPages-1} onClick={()=>setPage(p=>p+1)}>›</button>
            </div>
          )}
        </div>
      </div>

      {/* ══════ FULL VIEWER ══════ */}
      {viewer&&!minimized&&(
        <div className="ls-viewer">
          <div className="ls-vnav">
            <div className="ls-vnav-left">
              <button className="ls-back" onClick={()=>setLeaveModal(true)}>← Back</button>
              <div className="ls-vhost">
                <span className="ls-vpulse"/>
                <div className="ls-vav">{ini(hostName)}</div>
                <div>
                  <p className="ls-vname">{hostName}</p>
                  <p className="ls-vmeta">{partyType} · {(viewer.get("joined_users")||[]).length} in room</p>
                </div>
              </div>
            </div>
            <div className="ls-vnav-right">
              <span className="ls-vct">👁 {vCount+remoteUsers.length}</span>
              <button className="ls-cut-nav" onClick={()=>setCutModal(viewer)}>⊘ Cut</button>
              <button className="ls-leave-btn" onClick={()=>setLeaveModal(true)}>Leave ✕</button>
            </div>
          </div>

          <div className="ls-vbody">
            <div className="ls-vcol">
              <div className="ls-vstage">
                <div className="ls-stage-bg">
                  {hostImg?<img src={hostImg} alt="" className="ls-stage-bg-img"/>:<div className="ls-stage-bg-grad"/>}
                  <div className="ls-stage-bg-tint"/>
                </div>
                {/* ← This ID is now "lv-global-player" to match context */}
                <div id="lv-global-player" className="ls-vinner"/>
                {!hasVideo&&(
                  <div className="ls-stage-fg">
                    {partyType==="audio"
                      ?<div className="seat-container">{genSeats()}</div>
                      :(
                        <div className="ls-stage-load">
                          <div className="ls-stage-hero-wrap">
                            <div className="ls-stage-hero-ring"/>
                            {hostImg?<img src={hostImg} alt={hostName} className="ls-stage-hero-img"/>:<div className="ls-stage-hero-av">{ini(hostName)}</div>}
                          </div>
                          <p className="ls-stage-hero-name">{hostName}</p>
                          <div className="ls-stage-load-pill"><span className="ls-spin"/><span>Connecting video stream…</span></div>
                        </div>
                      )
                    }
                  </div>
                )}
              </div>

              {remoteUsers.length>1&&(
                <div className="ls-strip">
                  {remoteUsers.map(u=>(
                    <div key={u.uid} className={`ls-strip-item${spotUid===u.uid?" on":""}`} onClick={()=>setSpotUid(u.uid)}>
                      <div className="ls-strip-ico">{u.videoTrack?"📷":"♬"}</div>
                      <span className="ls-strip-lbl">…{String(u.uid).slice(-4)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="ls-ctrls">
                <button className={`ls-ctrl${muted?" on":""}`} onClick={toggleMute}>
                  <span>{muted?"🔇":"🔊"}</span><small>{muted?"Unmute":"Mute"}</small>
                </button>
                <button className="ls-ctrl" onClick={()=>setLeaveModal(true)}>
                  <span>⊟</span><small>Minimize</small>
                </button>
                <button className="ls-ctrl ls-ctrl--red" onClick={()=>setLeaveModal(true)}>
                  <span>📞</span><small>Leave</small>
                </button>
              </div>
            </div>

            <aside className="ls-sidebar">
              <div className="ls-stabs">
                <button className={`ls-stab${tab==="comments"?" on":""}`} onClick={()=>setTab("comments")}>
                  💬 Comments
                  {comments.length>0&&<span className="ls-cbadge">{comments.length}</span>}
                </button>
                <button className={`ls-stab${tab==="info"?" on":""}`} onClick={()=>setTab("info")}>ℹ Info</button>
              </div>
              {tab==="comments"&&(
                <div className="ls-cmt-wrap">
                  {cmtLoading&&comments.length===0?(
                    <div className="ls-cmt-load"><span className="ls-spin"/>Loading…</div>
                  ):comments.length===0?(
                    <div className="ls-cmt-empty"><span>💬</span><p>No comments yet</p></div>
                  ):(
                    <div className="ls-cmt-list">
                      {comments.map(c=>(
                        <div key={c.id} className={`ls-cmt${c.msg==="Joined the Room"?" ls-cmt--join":""}`}>
                          <div className="ls-cmt-av-wrap">
                            {c.image?<img src={c.image} alt={c.name} className="ls-cmt-av"/>:<div className="ls-cmt-av ls-cmt-av--ini">{ini(c.name)}</div>}
                            {c.level>0&&<span className="ls-cmt-lv">Lv{c.level}</span>}
                          </div>
                          <div className="ls-cmt-body">
                            <div className="ls-cmt-row">
                              <span className="ls-cmt-name">{c.name}</span>
                              <span className="ls-cmt-time">{ago(c.at)}</span>
                            </div>
                            <p className="ls-cmt-msg">{c.msg}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEnd}/>
                    </div>
                  )}
                </div>
              )}
              {tab==="info"&&(
                <div className="ls-info-wrap">
                  <div className="ls-info-sec">
                    <p className="ls-info-lbl">Stream Info</p>
                    {[["Channel",viewer.get("streaming_channel")||"—"],["Type",partyType],["Title",viewer.get("audio_room_title")||viewer.get("title")||"—"],["Host",hostName],["Diamonds",fmt(viewer.get("streaming_diamonds")||0)+" 💎"],["In Room",(viewer.get("joined_users")||[]).length],["Started",hhmm(viewer.createdAt)]].map(([k,v],i)=>(
                      <div key={i} className="ls-info-row"><span className="ls-info-k">{k}</span><span className="ls-info-v">{v}</span></div>
                    ))}
                  </div>
                  <div className="ls-info-sec">
                    <p className="ls-info-lbl">People in Room</p>
                    {(viewer.get("joined_users")||[]).map((u,i)=>(
                      <div key={i} className="ls-person">
                        {u.image?<img src={u.image} alt={u.name} className="ls-person-av"/>:<div className="ls-person-av ls-person-av--ini">{ini(u.name)}</div>}
                        <div className="ls-person-info"><span className="ls-person-name">{u.name}</span><span className="ls-person-uid">uid: {u.uid}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      {/* Joining loader */}
      {joining&&(
        <div className="ls-overlay ls-overlay--load">
          <div className="ls-load-card">
            <div className="ls-load-rings">
              <div className="ls-ring r1"/><div className="ls-ring r2"/><div className="ls-ring r3"/>
            </div>
            <p>Connecting to stream…</p>
          </div>
        </div>
      )}
    </div>
  );
}