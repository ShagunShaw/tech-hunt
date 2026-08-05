Koi team agr time se phle game khtm krta h, ya phir uska time duration end ho jata h (i.e. game ended before team could finish its game) toh bhi, last mei uska 'timeTaken' field add krna mtt bhulna



before accessing any game route check whether the groupId is aborted/disqualified or not (check it from redis, we had stored there)


Q) how do you know which group is making the request to your game routes?
Ans) Dont trust frontend for groupId as anyone can send any groupId.

Instead fetch groupId from DB using req.user.id:

""" req.user.id → query GroupMember table → get their groupId """

or/also ,

Store this in Redis against participantId at group creation time:

"""   "participant:groupId:userId" → groupId   """

Then middleware reads from Redis — fast, no DB call, trustworthy. ✅