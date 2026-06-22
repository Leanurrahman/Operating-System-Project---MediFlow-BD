import { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Send, 
  X, 
  User, 
  ShieldAlert, 
  PhoneCall, 
  CheckCheck, 
  Circle, 
  AlertCircle 
} from "lucide-react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "motion/react";

export default function EmergencyChatSystem({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [chatRoomsList, setChatRoomsList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [userOnlineMap, setUserOnlineMap] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Monitor user's active/assigned Emergency Requests
  useEffect(() => {
    if (!currentUser) return;

    const reqsRef = collection(db, "emergencyRequests");
    let q;

    if (currentUser.role === "patient") {
      q = query(reqsRef, where("patientId", "==", currentUser.uid));
    } else if (currentUser.role === "ambulance_operator") {
      q = query(reqsRef, where("assignedOperatorId", "==", currentUser.uid));
    } else {
      // Admins can see all active/pending emergency requests
      q = query(reqsRef);
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let activeReq = null;
      const list = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        const id = docSnap.id;
        const normalizedStatus = (item.status || "").toLowerCase();
        
        // Active if not completed and not cancelled
        const isActive = normalizedStatus !== "completed" && normalizedStatus !== "cancelled";
        
        list.push({ ...item, id });
        if (isActive && currentUser.role !== "hospital_admin") {
          activeReq = { ...item, id };
        }
      });

      if (currentUser.role === "patient" || currentUser.role === "ambulance_operator") {
        setActiveRequest(activeReq);
        if (activeReq) {
          setActiveRoom("room_" + activeReq.id);
        } else {
          setActiveRoom(null);
        }
      }
    }, (error) => {
      console.warn("[EmergencyChatSystem] Error listening to emergencyRequests stream:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Fetch/listen to list of all Chat Rooms (For Admins)
  useEffect(() => {
    if (!currentUser || currentUser.role !== "hospital_admin") return;

    const roomsRef = collection(db, "chatRooms");
    const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id });
      });
      setChatRoomsList(list);
      
      // Auto select the first room if there's no active room selected
      if (list.length > 0 && !activeRoom) {
        setActiveRoom(list[0].roomId);
      }
    }, (error) => {
      console.warn("[EmergencyChatSystem] Error listening to chatRooms stream:", error);
    });

    return () => unsubscribe();
  }, [currentUser, activeRoom]);

  // 3. Socket.io Real-Time Room Coordination & Transient Events
  useEffect(() => {
    if (!currentUser || !activeRoom) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to Socket.io local multiplexer server
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    // Join room channel
    socket.emit("join_room", { 
      roomId: activeRoom, 
      userId: currentUser.uid, 
      role: currentUser.role 
    });

    // Listen to typing status notifications from operators/users
    socket.on("typing_update", ({ userId, isTyping, userName }) => {
      if (userId !== currentUser.uid) {
        setTypingUsers(prev => {
          const next = { ...prev };
          if (isTyping) {
            next[userId] = userName || "Someone";
          } else {
            delete next[userId];
          }
          return next;
        });
      }
    });

    // Listen to real-time participant connection status
    socket.on("user_connected_status", ({ userId, role, connected }) => {
      if (userId !== currentUser.uid) {
        setUserOnlineMap(prev => ({
          ...prev,
          [userId]: connected
        }));
      }
    });

    return () => {
      socket.emit("leave_room", { roomId: activeRoom, userId: currentUser.uid });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser, activeRoom]);

  // 4. Firestore Messages Synchronizer
  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      return;
    }

    const msgRef = collection(db, "messages");
    const q = query(msgRef, where("roomId", "==", activeRoom));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.id });
      });
      
      // Sort messages temporally
      list.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      // Compute unread count on changes if the box is closed
      if (!isOpen && list.length > 0) {
        const lastOwnMessageIndex = [...list].reverse().findIndex(m => m.senderId === currentUser.uid);
        const actualUnread = lastOwnMessageIndex === -1 ? list.length : lastOwnMessageIndex;
        setUnreadCount(actualUnread);
      } else if (isOpen) {
        setUnreadCount(0);
      }

      setMessages(list);
    }, (error) => {
      console.warn("[EmergencyChatSystem] Error listening to messages log stream:", error);
    });

    return () => unsubscribe();
  }, [activeRoom, isOpen, currentUser]);

  // Scroll to bottom helper
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers]);

  // Toggle open triggers clear of unreads
  const handleToggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  // 5. Send message payload handler
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || !activeRoom) return;

    const cleanInput = inputValue.trim();
    setInputValue("");

    // Instant socket trigger to immediately dismiss typing state
    if (socketRef.current) {
      socketRef.current.emit("typing_status", { 
        roomId: activeRoom, 
        userId: currentUser.uid, 
        isTyping: false 
      });
    }

    const messageId = "msg_" + Date.now() + "_" + Math.floor(Math.random() * 100);
    const messageDoc = {
      messageId,
      roomId: activeRoom,
      senderId: currentUser.uid,
      senderName: currentUser.name || "Client Support",
      senderRole: currentUser.role,
      text: cleanInput,
      timestamp: new Date().toISOString(),
      read: false
    };

    try {
      // 1. Write message document to Firestore
      await setDoc(doc(db, "messages", messageId), messageDoc);

      // 2. Broadcast immediately over websocket
      if (socketRef.current) {
        socketRef.current.emit("send_message", messageDoc);
      }
    } catch (err) {
      console.error("Transmission error writing chat message:", err);
    }
  };

  // Typing state debouncer
  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    if (socketRef.current) {
      socketRef.current.emit("typing_status", { 
        roomId: activeRoom, 
        userId: currentUser.uid, 
        isTyping: true,
        userName: currentUser.name 
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit("typing_status", { 
            roomId: activeRoom, 
            userId: currentUser.uid, 
            isTyping: false 
          });
        }
      }, 2000);
    }
  };

  // Clean label names for presentation
  const getRoleDisplayName = (role) => {
    if (role === "hospital_admin") return "Admin Desk";
    if (role === "ambulance_operator") return "Ambulance Operator";
    return "Patient";
  };

  // Format message stamp
  const formatTimeStr = (isoString) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Check if disabled
  const hasActiveAccess = currentUser?.role === "hospital_admin" || !!activeRequest;

  return (
    <>
      {/* Floating Support Button Trigger */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence>
          {!isOpen && !hasActiveAccess && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="mb-2.5 bg-slate-900 text-slate-100 text-[11px] font-medium px-3.5 py-2.5 rounded-xl shadow-lg border border-slate-800 pointer-events-none max-w-xs text-center"
            >
              <div className="flex items-center gap-1.5 text-orange-450 font-bold mb-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Support Offline</span>
              </div>
              <span className="text-slate-400">Submit an emergency request to activate support chat.</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={hasActiveAccess ? handleToggleOpen : undefined}
          disabled={!hasActiveAccess}
          className={`group flex items-center justify-center h-14 rounded-full shadow-2xl transition-all duration-500 ease-in-out select-none relative ${
            hasActiveAccess 
              ? "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer hover:scale-105 active:scale-95 hover:shadow-orange-500/25 hover:shadow-3xl" 
              : "bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-80"
          } ${hasActiveAccess ? "w-14 md:hover:w-52 px-4" : "w-14"}`}
          title={hasActiveAccess ? "Emergency Support Chat" : "Submit emergency request to activate chat"}
          id="btn-emergency-support-chat-trigger"
        >
          <div className="flex items-center gap-2 overflow-hidden justify-center max-w-full">
            <MessageSquare className="w-6 h-6 shrink-0 animate-pulse" />
            {hasActiveAccess && (
              <span className="text-xs font-bold max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 transition-all duration-500 ease-in-out whitespace-nowrap hidden md:inline-block">
                Emergency Support
              </span>
            )}
          </div>
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black font-mono w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-950 text-[10px] shadow-md z-10 transition-transform group-hover:scale-110">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Floating Chat Workspace Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-24 right-6 z-50 w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-850 overflow-hidden flex flex-col h-[520px]"
            id="emergency-support-chat-workspace"
          >
            {/* Header section */}
            <div className="bg-slate-900 border-b border-slate-800 p-4 shrink-0 flex justify-between items-center text-slate-200">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 text-slate-900 w-10 h-10 rounded-xl flex items-center justify-center font-bold">
                  SOS
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white tracking-wide">Emergency Support Area</h4>
                  <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                    {activeRoom ? activeRoom.toUpperCase() : "SELECT ACTIVE ROOM"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main view section split by Role */}
            <div className="flex-1 min-h-0 flex bg-slate-50 dark:bg-slate-900/40">
              {/* Left sidebar for Admin to select active chat room sessions */}
              {currentUser?.role === "hospital_admin" && chatRoomsList.length > 0 && (
                <div className="w-36 border-r border-slate-150 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/80 overflow-y-auto shrink-0 py-2">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase block px-3 mb-1">Active Rooms</span>
                  {chatRoomsList.map((room) => {
                    const roomId = room.roomId || room.id || "";
                    const isActive = roomId === activeRoom;
                    return (
                      <button
                        key={room.id || roomId}
                        onClick={() => setActiveRoom(roomId)}
                        className={`w-full text-left px-3 py-2 text-xs truncate font-mono transition block border-l-2 select-none ${
                          isActive 
                            ? "bg-white dark:bg-slate-850 text-orange-600 font-bold border-l-orange-500" 
                            : "text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border-l-transparent cursor-pointer"
                        }`}
                      >
                        {roomId.replace("room_req_", "").replace("room_", "").slice(0, 10)}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Chat messages viewport */}
              <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-950">
                <div className="flex-1 p-4 overflow-y-auto space-y-3.5 min-h-0">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/55 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-100 dark:border-slate-850">
                      <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700 animate-bounce mb-2" />
                      <span className="text-xs font-bold text-slate-500">Live Support Channel Connected</span>
                      <p className="text-[10px] text-slate-400 max-w-[180px] mt-1">Start writing a message to talk directly and safely with support responders.</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSystem = msg.senderRole === "system" || msg.senderId === "system";
                      const isOwn = msg.senderId === currentUser.uid;

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-450 px-3 py-1 rounded-full font-mono border border-slate-150 dark:border-slate-800 max-w-[85%] text-center shadow-[0_1px_2px_rgba(0,0,0,0.01)] leading-normal">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={msg.id} 
                          className={`flex items-start gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          {/* Left avatar for incoming messages */}
                          {!isOwn && (
                            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 flex items-center justify-center text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 font-mono shrink-0">
                              {msg.senderRole === "hospital_admin" ? "AD" : (msg.senderRole === "ambulance_operator" ? "OP" : "PT")}
                            </div>
                          )}

                          <div className={`max-w-[75%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                            {/* Role indicator stamp helper */}
                            <span className="text-[9px] text-slate-400 font-mono font-medium mb-0.5">
                              {isOwn ? "You" : `${msg.senderName} (${getRoleDisplayName(msg.senderRole)})`}
                            </span>
                            
                            <div className={`px-3 py-2.5 rounded-2xl text-xs leading-normal shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                              isOwn 
                                ? "bg-orange-500 text-white rounded-tr-none" 
                                : "bg-slate-100 dark:bg-slate-900 text-slate-850 dark:text-slate-150 rounded-tl-none border border-slate-150 dark:border-slate-850"
                            }`}>
                              <p className="whitespace-pre-wrap breakdown-words font-sans">{msg.text}</p>
                            </div>
                            
                            {/* Time stamp */}
                            <span className="text-[8.5px] text-slate-400 font-mono mt-0.5 tracking-wider flex items-center gap-0.5">
                              {formatTimeStr(msg.timestamp)}
                              {isOwn && <CheckCheck className="w-3 h-3 text-orange-550 shrink-0" />}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Typing indicators */}
                {Object.keys(typingUsers).length > 0 && (
                  <div className="px-4 py-1.5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-850 shrink-0 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping inline-block" />
                    <span>{Object.values(typingUsers).join(", ")} is typing support response...</span>
                  </div>
                )}

                {/* Input write bar */}
                <form 
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-slate-150 dark:border-slate-850 shrink-0 flex gap-2 items-center bg-slate-50 dark:bg-slate-900/20"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Type urgent emergency message..."
                    className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans tracking-wide"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || !activeRoom}
                    className={`p-2.5 rounded-xl text-white shadow-md transition-all shrink-0 select-none ${
                      inputValue.trim() && activeRoom
                        ? "bg-orange-500 hover:bg-orange-600 hover:scale-105 active:scale-95 cursor-pointer" 
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
