import { collection, getDocs, query, where } from "firebase/firestore";

import React, { useState, useRef, useEffect } from "react";
import { Navigate } from "react-router";
import AddPartner from "./AddPartner";

import { db } from "./firebaseconnector";
import { useAppDispatch, useAppSelector } from "./Hooks";

import { CloseIcon, MenuIcon, SendMessageIcon } from "./icons";
import { addChatDetails, selectUserDetails } from "./userreducer";

var mqtt = require("mqtt");


var client = mqtt.connect("wss://test.mosquitto.org:8080/");


if (client.connected) {
	console.log("connected");
} else {
	console.log("sorry not able to connect");
}
function Chat() {
	const input = useRef(null);
	const userInfo = useAppSelector(selectUserDetails);
	const [partnerPopup, setPartnerPopup] = useState(true);
	const dispatch = useAppDispatch();
	const [message, setMessage] = useState("");
	const [messages, setMessages] = useState([]);
	const [allUsers, setAllUsers] = useState([]);
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [currentState, setCurrentState] = useState({
		name: "",
		profileUrl: "",
		currentChannelName: "",
	});

	const sendMessage = async () => {
		console.log(currentState.currentChannelName);
		await client.publish(
			currentState.currentChannelName,
			message + userInfo.id
		);
		console.log("senging message: " + message, currentState.currentChannelName);
		setMessage("");
	};

	const getConnectionInfo = async () => {
		if (userInfo.subscribed) {
			var info = userInfo.subscribed;
			var tosub = [];

			for (var i = 0; i < info.length; i++) {
				tosub.push(info[i].suid);
			}
			const q = await query(
				collection(db, "users"),
				where("userId", "in", tosub)
			);

			const querySnapshot = await getDocs(q);
			var sideusers = [];
			querySnapshot?.forEach(async (docdetails) => {
				var data = docdetails.data();
				for (var i = 0; i < info.length; i++) {
					if (info[i].suid === data.userId) {
						data.scid = info[i].scid;
						break;
					}
				}
				sideusers.push(data);
			});

			setAllUsers(sideusers);
		}
	};

	useEffect(() => {
		client.on("message", (topic, message) => {
			var note;
			note = message.toString();

			var temp = note.substring(0, note.length - 36);

			setMessages((prevState) => {
				var data = prevState;
				if (note.substring(note.length - 36) === userInfo.id)
					data.push({ message: temp, isSelf: true });
				else data.push({ message: temp, isSelf: false });
				return data;
			});
			var data = [];
			if (userInfo.chat[topic]) {
				for (var i = 0; i < userInfo.chat[topic].length; i++) {
					data.push({
						message: userInfo.chat[topic][i].message,
						isSelf: userInfo.chat[topic][i].isSelf,
					});
				}
			}
			if (note.substring(note.length - 36) === userInfo.id) {
				data.push({ message: temp, isSelf: true });
			} else {
				data.push({ message: temp, isSelf: false });
			}

			dispatch(
				addChatDetails({
					id: topic,
					chat: data,
				})
			);
			setMessage(" ");
			setMessage("");
		});
	}, [userInfo, dispatch]);

	useEffect(() => {
		if (!isSubscribed && userInfo.subscribed) {
			setIsSubscribed(true);
			var info = userInfo.subscribed;
			var tosub = [];
			if (info) {
				for (var i = 0; i < info.length; i++) {
					tosub.push(info[i].scid);
				}
			}
			client.subscribe(tosub);
			console.log(client);
		}
	}, [setIsSubscribed, isSubscribed, userInfo]);

	useEffect(() => {
		if (input && input.current && input.current.scrollTop)
			input.current.scrollTop = input.current.scrollHeight;
	}, [messages.length, message]);

	useEffect(() => {
		try {
			getConnectionInfo();
		} catch (error) {
			console.error("Error updating document: ", error);
		}
	}, []);

	useEffect(() => {
		if (userInfo.chat[currentState.currentChannelName]) {
			var temp = [];
			for (
				var i = 0;
				i < userInfo.chat[currentState.currentChannelName].length;
				i++
			) {
				temp.push({
					message: userInfo.chat[currentState.currentChannelName][i].message,
					isSelf: userInfo.chat[currentState.currentChannelName][i].isSelf,
				});
			}
			setMessages(temp);
		} else setMessages([]);
	}, [currentState.currentChannelName, userInfo.chat]);

	const [isMenuClosed, setIsMenuClosed] = useState(true);
	return (
		<div className="main">
			<div className="main-left">
				<div className="main-left-avtar">
					<div className="main-left-avtar-logo">Spat</div>
					<img
						className="main-left-avtar-element"
						src={userInfo.imageUrl}
						alt=""
					/>
				</div>
				<div className="main-left-users">
					{allUsers.map((element, index) => {
						return (
							<div
								key={index}
								onClick={() => {

									for (var i = 0; i < userInfo.subscribed.length; i++) {
										if (userInfo.subscribed[i].suid === element.userId) {
											setCurrentState({
												...currentState,
												name: element.userName,
												profileUrl: element.imageUrl,
												currentChannelName: userInfo.subscribed[i].scid,
											});
										}
									}
								}}
								className="main-left-users-element"
							>
								<div className="main-left-users-element-avtar">
									<img
										className="main-left-users-element-avtar-img"
										src={element.imageUrl}
										alt=""
									/>
								</div>
								<div className="main-left-users-element-details">
									<div className="main-left-users-element-details-name">
										{element.userName}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
			<div className="main-right">
				{currentState.name ? (
					<>
						<div className="main-right-top">
							<div className="main-right-top-avtar">
								<img
									className="main-right-top-avtar-img"
									src={currentState.profileUrl}
									alt=""
								/>
							</div>
							<div className="main-right-top-name">{currentState.name}</div>
							<div
								className="main-right-top-functions"
								onClick={() => {
									setIsMenuClosed(!isMenuClosed);
								}}
							>
								{isMenuClosed ? <MenuIcon /> : <CloseIcon />}
							</div>
						</div>
						<div className="main-right-chat" ref={input}>
							{messages ? (
								messages.map(function (message, index) {
									return (
										<div
											className={
												message.isSelf
													? "main-right-chat-self"
													: "main-right-chat-other"
											}
											key={index}
										>
											{message.message}
										</div>
									);
								})
							) : (
								<div>no messages</div>
							)}
						</div>
						<div className="main-right-input">
							<div className="main-right-input-avtar">
								<img
									className="main-right-input-avtar-img"
									src={userInfo.imageUrl}
									alt=""
								/>
							</div>
							<div className="main-right-input-element">
								<input
									type="text"
									onChange={(e) => {
										setMessage(e.target.value);
									}}
									value={message}
									className="main-right-input-element-input"
								/>
							</div>
							<div className="main-right-input-button" onClick={sendMessage}>
								<SendMessageIcon />
							</div>
						</div>
					</>
				) : (
					<></>
				)}
			</div>
			{partnerPopup ? (
				<div className="AddPartner">
					<div
						onClick={() => {
							setPartnerPopup(false);
						}}
						className="AddPartner-cross"
					>
						+
					</div>
					<AddPartner />
				</div>
			) : (
				<></>
			)}
			{!userInfo.id && <Navigate to="/" />}
		</div>
	);
}

export default Chat;
