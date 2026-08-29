"use strict";
class MockEmailProvider{
  constructor(){this.providerId="mock-no-send";this.deliveries=[];}
  async send(message){if(!message||!message.to||!message.subject)throw new Error("A recipient and subject are required.");const receipt={provider:this.providerId,status:"mocked-not-sent",messageId:`mock-${this.deliveries.length+1}`};this.deliveries.push({subject:message.subject,status:receipt.status});return receipt;}
}
function productionProvider(){throw new Error("Production email delivery is disabled until a secure provider and credentials are explicitly configured.");}
module.exports={MockEmailProvider,productionProvider};
