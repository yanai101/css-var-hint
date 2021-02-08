(function () {
	const vscode = acquireVsCodeApi();

	const oldState = vscode.getState();

	const updateBtn = document.getElementById('varHint:updateList');
	updateBtn.style.display = 'none';

	const mainContainer = document.getElementById('varHint:varList');

	mainContainer.innerText = 'Loading...';

	// Handle messages sent from the extension to the webview
	window.addEventListener('message', event => {
			const message = event.data; // The json data that the extension sent
			console.log(message)
			switch (message.type) {
					case 'refactor':
							currentCount = Math.ceil(currentCount * 0.5);
							counter.textContent = currentCount;
							break;
					case 'update':
						updateBtn.style.display = "none";
						mainContainer.innerText = 'Loading...';
						if(message.value.length){
							updateList(message.value)
						}
						updateBtn.style.display = "block";
						break;			
			}
	});


	updateBtn.addEventListener('click',()=>{
		vscode.postMessage({command:'refresh', text:''})
	},false);

	const updateList = (data)=>{
		mainContainer.innerText='';
		let html = `<ul class="var-hint-list">`;
		data.forEach(([key, value])=>{
			const isColor =
			value.val.trim().startsWith("#") || value.val.trim().startsWith("rgba") || value.val.trim().startsWith("hsl") || value.val.trim().startsWith("hsla") || value.val.trim().startsWith("rgb");
			const valueDisplay = isColor ? `<span class="color-show" style="background-color: ${value.val}"></span>` : '';
			html += `<li><strong data-file="${value.file}"> ${key}: </strong>   ${valueDisplay}  ${value.val} </li>`;
		})
    html += "</ul>";
		mainContainer.insertAdjacentHTML("afterbegin",html);
		const liList = document.querySelectorAll('.var-hint-list li strong');
		liList.forEach(element=> {
			element.addEventListener('click', openFile ,false)
		})
	}

	const openFile = (e)=>{
		vscode.postMessage({command:'openFile', text:e.target.dataset.file})
	}
}());