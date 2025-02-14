sap.ui.controller("sap.demo.bpmrulesshoppingcart.view.Order", {


	_simulateGrossPrice: function() {
		var oViewModel = this.getView().getModel().getData();
		var array = oViewModel.modeldata;
		
		var grossPrice = 0;
		for (var arrIndex = 0; arrIndex <= array.length - 1; arrIndex++) {
			var oShipmentModel = array[arrIndex];
			grossPrice += oShipmentModel.GrossPrice;
		}
		
		oViewModel.grossprice = grossPrice;
		grossPrice = grossPrice.toFixed(2);
		this.getView().getModel().setData({grossprice:grossPrice},true);
	},
	
	onInit: function() {
		var oModel = this.getView().getViewData();
		this.getView().setModel(oModel);

		// handle data binding validation results
		sap.ui.getCore().attachValidationError(
			function(oEvent) {
				var oElement = oEvent.getParameter("element");
				if (oElement.setValueState) {
					oElement.setValueState(sap.ui.core.ValueState.Error);
				}
			}
		);

		sap.ui.getCore().attachValidationSuccess(
			function(oEvent) {
				var oElement = oEvent.getParameter("element");
				if (oElement.setValueState) {
					oElement.setValueState(sap.ui.core.ValueState.None);
				}
			}
		);
		
		this._simulateGrossPrice();
	},

	_checkInput: function() {
		var oView = this.getView();
		var aInputs = [
			oView.byId("inputName"),
			oView.byId("inputAddress"),
			oView.byId("inputMail"),
			oView.byId("inputNumber")
		];

		// make sure all fields are not empty
		// (this is not done by data binding validation
		//  as data binding only runs on changing values)
		jQuery.each(aInputs, function(i, oInput) {
			if (!oInput.getValue()) {
				oInput.setValueState(sap.ui.core.ValueState.Error);
			}
		});

		// check that all fields are ok
		for (var i = 0; i < aInputs.length; i++) {
			if (aInputs[i].getValueState() === sap.ui.core.ValueState.Error) {
				return false;
			}
		}
		return true;
	}
});