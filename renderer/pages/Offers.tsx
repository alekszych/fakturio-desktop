import React, {FC, useEffect, useState} from "react"
import {Offer, SimplifiedOffer} from "../../global-types"
import {useGetOffers} from "../hooks/useGetOffers"
import {useCreateInvoices} from "../hooks/useCreateInvoices"
import {OffersHeader} from "../components/Offers/OffersHeader"
import {OffersTable} from "../components/Offers/OffersTable"
import {OffersFooter} from "../components/Offers/OffersFooter"
import {useSelector} from "react-redux"

const Offers: FC = () => {
	const token = useSelector((state: any) => state.token.value)
	const account = useSelector((state: any) => state.account)
	const [data, setData] = useState<SimplifiedOffer[]>([])
	const [page, setPage] = useState(0)
	const [checked, setChecked] = useState<Offer[]>([])
	const [offers, setOffers] = useState<Offer[]>([])

	useEffect(() => {
		(async () => {
			if (!token)
				return
			await useGetOffers(setData, setOffers, page, token)
			setChecked([])
		})()
	}, [token, page])

	const handleCreateInvoices = async () => {
		setData([])
		await useCreateInvoices(checked, account)
		await useGetOffers(setData, setOffers, page, token)
		setChecked([])
	}

	const handleReloadInvoices = async () => {
		await useGetOffers(setData, setOffers, page, token)
	}

	if (!data || data.length === 0) {
		return (
			<div className={"absolute left-5 right-5 top-5 bottom-5 flex m-auto w-fit h-fit flex-col items-center content-center text-xl"}>
				Ładowanie
			</div>
		)
	}

	return (
		<>
			<OffersHeader handleCreateInvoices={handleCreateInvoices}/>
			<div className="rounded-lg border border-gray-200 shadow-md overflow-auto min-w-[800px] mr-4">
				<OffersTable checked={checked} setChecked={setChecked} data={data} reloadInvoices={handleReloadInvoices}/>
			</div>
			<OffersFooter page={page} setPage={setPage} offers={offers}/>
		</>
	)
}

export default Offers