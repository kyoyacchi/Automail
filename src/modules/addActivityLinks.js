async function addActivityLinks(activityID){
	async function arrowCallback(res){
		const {data, errors} = res;
		if(errors){
			return;
		}
		let adder = function(link){
			if(!location.pathname.includes("/activity/" + activityID)){
				return;
			}
			let activityLocation = document.querySelector(".activity-entry");
			if(activityLocation){
				activityLocation.appendChild(link);
				return;
			}
			else{
				setTimeout(function(){adder(link)},200);
			}
		};
		let queryPrevious;
		let queryNext;
		let variables = {
			userId: data.Activity.userId || data.Activity.recipientId,
			createdAt: data.Activity.createdAt
		};
		if(data.Activity.type === "ANIME_LIST" || data.Activity.type === "MANGA_LIST"){
			variables.mediaId = data.Activity.media.id;
			queryPrevious = `
query ($userId: Int,$mediaId: Int,$createdAt: Int){
	Activity(
		userId: $userId,
		mediaId: $mediaId,
		createdAt_lesser: $createdAt,
		sort: ID_DESC
	){
		... on ListActivity{siteUrl createdAt id}
	}
}`;
			queryNext = `
query($userId: Int,$mediaId: Int,$createdAt: Int){
	Activity(
		userId: $userId,
		mediaId: $mediaId,
		createdAt_greater: $createdAt,
		sort: ID
	){
		... on ListActivity{siteUrl createdAt id}
	}
}`;
		}
		else if(data.Activity.type === "TEXT"){
			queryPrevious = `
query($userId: Int,$createdAt: Int){
	Activity(
		userId: $userId,
		type: TEXT,
		createdAt_lesser: $createdAt,
		sort: ID_DESC
	){
		... on TextActivity{siteUrl createdAt id}
	}
}`;
			queryNext = `
query($userId: Int,$createdAt: Int){
	Activity(
		userId: $userId,
		type: TEXT,
		createdAt_greater: $createdAt,
		sort: ID
	){
		... on TextActivity{siteUrl createdAt id}
	}
}`;
		}
		else if(data.Activity.type === "MESSAGE"){
			let link = create("a","hohPostLink","↑",false,"left:-25px;top:25px;");
			link.href = "/user/" + data.Activity.recipient.name + "/";
			link.title = translate("$navigation_profileLink",data.Activity.recipient.name);
			adder(link);
			variables.messengerId = data.Activity.messengerId;
			queryPrevious = `
query($userId: Int,$messengerId: Int,$createdAt: Int){
	Activity(
		userId: $userId,
		type: MESSAGE,
		messengerId: $messengerId,
		createdAt_lesser: $createdAt,
		sort: ID_DESC
	){
		... on MessageActivity{siteUrl createdAt id}
	}
}`;
			queryNext = `
query($userId: Int,$messengerId: Int,$createdAt: Int){
	Activity(
		userId: $userId,
		type: MESSAGE,
		messengerId: $messengerId,
		createdAt_greater: $createdAt,
		sort: ID
	){
		... on MessageActivity{siteUrl createdAt id}
	}
}`;
		}
		else{//unknown new types of activities
			return;
		}
		if(res.previous){
			if(res.previous !== "FIRST"){
				let link = create("a","hohPostLink","←",false,"left:-25px;");
				link.href = res.previous;
				link.rel = "prev";
				link.title = "Previous activity";
				adder(link);
			}
		}
		else{
			res.previous = "FIRST";
			const prevRes = await anilistAPI(queryPrevious, {variables});
			const {data: pdata, errors} = prevRes;
			if(errors){
				return;
			}
			let link = create("a","hohPostLink","←",false,"left:-25px;");
			link.title = "Previous activity";
			link.rel = "prev";
			link.href = pdata.Activity.siteUrl;
			adder(link);
			res.previous = pdata.Activity.siteUrl;
			updateCache("hohActivity" + activityID, res);
			pdata.Activity.type = data.Activity.type;
			pdata.Activity.userId = variables.userId;
			pdata.Activity.media = data.Activity.media;
			pdata.Activity.messengerId = data.Activity.messengerId;
			pdata.Activity.recipientId = data.Activity.recipientId;
			pdata.Activity.recipient = data.Activity.recipient;
			prevRes.next = document.URL;
			saveCache("hohActivity" + pdata.Activity.id, Object.assign(prevRes,{data: pdata}), 20*60*1000);
		}
		if(res.next){
			let link = create("a","hohPostLink","→",false,"right:-25px;");
			link.href = res.next;
			link.rel = "next";
			link.title = "Next activity";
			adder(link);
		}
		else{
			const nextRes = await anilistAPI(queryNext, {variables});
			const {data: ndata, errors} = nextRes;
			if(errors){
				return;
			}
			let link = create("a","hohPostLink","→",false,"right:-25px;");
			link.href = ndata.Activity.siteUrl;
			link.rel = "next";
			link.title = "Next activity";
			adder(link);
			res.next = ndata.Activity.siteUrl;
			updateCache("hohActivity" + activityID, res);
			ndata.Activity.type = data.Activity.type;
			ndata.Activity.userId = variables.userId;
			ndata.Activity.media = data.Activity.media;
			ndata.Activity.messengerId = data.Activity.messengerId;
			ndata.Activity.recipientId = data.Activity.recipientId;
			ndata.Activity.recipient = data.Activity.recipient;
			nextRes.previous = document.URL;
			saveCache("hohActivity" + ndata.Activity.id, Object.assign(nextRes,{data: ndata}), 20*60*1000);
		}
		return;
	}

	const dataQuery = `
query($id: Int){
	Activity(id: $id){
		... on ListActivity{
			type
			userId
			createdAt
			media{id}
		}
		... on TextActivity{
			type
			userId
			createdAt
		}
		... on MessageActivity{
			type
			recipientId
			recipient{name}
			messengerId
			createdAt
		}
	}
}`
	//has to be auth now that private messages are a thing
	const data = await anilistAPI(dataQuery, {
		variables: {id: activityID},
		cacheKey: "hohActivity" + activityID,
		duration: 20*60*1000,
		auth: true
	})
	return arrowCallback(data)
}
