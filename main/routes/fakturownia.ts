import {Request, Response, Router} from "express"
import axios from "axios"
import {knex} from "../api"
import {AccountData, Address, SimpleAccount, SimplifiedOffer} from "../../global-types"
import * as fs from "fs"
import path from "path"
import {app} from "electron"

const fakturowniaRouter = Router()

fakturowniaRouter.get("/invoice", async (req: Request, res: Response) => {
	try {
		const invoices = await knex.select().from("invoice")
		const data = invoices.map(invoice => invoice.id)
		res.json(data)
	}
	catch (e) {
		res.json({error: e.message, errorMessage: "Błąd podczas pobierania faktur"})
	}
})

fakturowniaRouter.delete("/invoice/:invoiceId", async (req: Request<{invoiceId: string}>, res: Response) => {
	try {
		const {invoiceId} = req.params
		await knex("invoice").where("id", invoiceId).del()
		fs.unlink(path.join(app.getPath("userData"), `/invoices/${invoiceId}.pdf`), (e) => {
			if(e) {
				res.json({error: e.message, errorMessage: "Błąd podczas usuwania faktury"})
			}
			res.json({message: "Faktura została usunięta"})
		})
	}
	catch (e) {
		res.json({error: e.message, errorMessage: "Błąd podczas usuwania faktury"})
	}
})

fakturowniaRouter.get("/invoice/file/:invoiceId", async (req: Request<{invoiceId: string}>, res: Response) => {
	try {
		const {invoiceId} = req.params
		const filePath = path.join(app.getPath("userData"), `/invoices/${invoiceId}.pdf`)

		fs.readFile(filePath, (err, data) => {
			if (err) {
				throw new Error("Error reading file")
			}
			res.setHeader("Content-Type", "application/pdf")
			res.setHeader("Content-Disposition", `attachment; filename=${invoiceId}.pdf`)
			res.end(data)
		})
	}
	catch (e) {
		res.json({error: e.message, errorMessage: "Błąd podczas pobierania pliku"})
	}
})


fakturowniaRouter.post("/invoice", async (req: Request<{}, {}, {data: SimplifiedOffer[], account: SimpleAccount}>, res: Response) => {
	try {
		const {data, account} = req.body
		const accountData = await knex.where("accountId", account.id).select().table("accountData")
		const accounts = await knex.where("id", account.id).select().table("account")
		const {
			"name": sellerName,
			"taxNo": sellerTaxNo,
			"street": sellerStreet,
			"postCode": sellerPostCode,
			"city": sellerCity,
			"country": sellerCountry,
			"lumpSumTax": sellerLumpSumTax,
			"vat": sellerVat,
			"exemptTaxKind": sellerExemptTaxKind
		}: AccountData = accountData[0]
		const {fakturowniaToken, fakturowniaName} = accounts[0]

		for (const {products, deliveryCost, currency, address, id, paymentType} of data) {
			const positions = products.map(product => {
				const price = parseFloat(product.price.amount) * product.quantity
				return {
					"name": product.offer.name,
					"total_price_gross": price,
					"quantity": product.quantity,
					"lump_sum_tax": sellerLumpSumTax,
					"tax": sellerVat
				}
			})

			positions.push({
				"name": "Koszty wysyłki",
				"total_price_gross": parseFloat(deliveryCost),
				"quantity": 1,
				"lump_sum_tax": sellerLumpSumTax,
				"tax": sellerVat
			})

			const {
				"firstName": buyerFirstname,
				"lastName": buyerLastname,
				"street": buyerStreet,
				"city": buyerCity,
				"zipCode": buyerZipCode,
				"countryCode": buyerCountryCode,
				"company": buyerCompany
			}: Address = address

			const invoice = {
				"kind": "vat",
				"seller_name": sellerName,
				"seller_tax_no": sellerTaxNo,
				"seller_street": sellerStreet,
				"seller_post_code": sellerPostCode,
				"seller_city": sellerCity,
				"seller_country": sellerCountry,
				"buyer_post_code": buyerZipCode,
				"buyer_city": buyerCity,
				"buyer_street": buyerStreet,
				"buyer_country": buyerCountryCode,
				"positions": positions,
				"currency": currency,
				"place": sellerCity,
			}

			if (buyerFirstname) {
				invoice["buyer_first_name"] = buyerFirstname
				invoice["buyer_last_name"] = buyerLastname
			}

			if (buyerCompany) {
				invoice["buyer_name"] = buyerCompany.name
				invoice["buyer_tax_no"] = buyerCompany.taxId
			}

			if (sellerVat.toLowerCase() == "zw"){
				invoice["exempt_tax_kind"] = sellerExemptTaxKind
			}

			if(paymentType === "CASH_ON_DELIVERY"){
				invoice["payment_type"] = "Pobranie"
			}

			if(paymentType === "ONLINE"){
				invoice["payment_type"] = "Przelew"
			}

			const response = await axios.post(`https://${fakturowniaName}.fakturownia.pl/invoices.json`, {
				"api_token": fakturowniaToken,
				"invoice": invoice
			},
			{
				headers: {"Content-Type": "application/json"}
			})

			const {data: fileData} = await axios.get(`https://${fakturowniaName}.fakturownia.pl/invoices/${response.data.id}.pdf?api_token=${fakturowniaToken}`, {responseType: "arraybuffer"})
			const filePath = path.join(app.getPath("userData"), `/invoices/${id}.pdf`)
			fs.writeFile(filePath, fileData, (err) => {
				if(err){
					throw Error(err.message)
				}
				knex("invoice").where("id", id).del().then(() => {
					knex("invoice").insert({id: id, status: "local"}).then(() => {})
				})
			})
		}

		res.status(200).json({message: "Faktury zostały utworzone"})
	}
	catch (e) {
		res.json({error: e.message, errorMessage: "Błąd podczas tworzenia faktur"})
	}
})

export default fakturowniaRouter