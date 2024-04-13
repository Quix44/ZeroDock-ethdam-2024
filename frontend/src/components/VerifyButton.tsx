"use client"

import { Button } from "@/components/ui/button";
import { LightningBoltIcon } from "@radix-ui/react-icons";
import { toast } from "./ui/use-toast";

function VerifyButton({ publicData, proof }: any) {
    const vk = "1285867bc10bda745a70bcae67294a48abf47a0cbf3d121543f99642982215ded64035c4a527eb49fd90f3339d78d5a9111c3e00f50ef193d027852d270b6adae23ddaee5a8ed7525e8a3a561d5ba347fafdafe6b28d2585b2bfd5b1c79100cd0f017647b184ac9dcba58ffe6587aca62b3ed8411252b64433248ace439a29a78441c437513b4b95fc0a3f611693d13c0869fc8b950f8a4feac2f1c3ae4c1c53190389a6193adfba45cab66241b5c5850df936248354eede444366bbbbf92820149c7a49650df8a5bb69ca87cba9f3c727eed4801b175acced62a51580df45ee6c76c272be4b2f96245ebde9e9aec0370016bc1a8ed39da153d2d177bf8271f5fa4326ec0b4e4efe3e84fe16b2a91dc89ea9885368da9b40e6fffd320e5b12850e1b5e36c0226860e50d652443ee080f6c3308660bdd5880a7828dc611c4d5efd21e4fcbb75a31bf8c2cd231ee8e95d715189524901b7bb6175e7799e6b5625ec052f41b7cb23f7f9b80b835d9e8e2a8181aa04e896dae526628d18a0fb086850a5e95a039950bccd5a83809efed6dde398f99fe4855d0a20135130cbbabca1a96194eb2dd942db9b57ed67d9cc1f8720e20c6547ebc76aa6ddc34d54258a38d6cd94b943e75e910d25066c93f36526217b16b7b91c1d3b2edb0c9a73732e88d0b78a9047b70d7c09484648b850d5eb406b925e85daa17b1f6bd0774fe9462e6b153f10247b827866b08a35fc5ba6d9f08dd307c7fe33e475c9cc8ae7d5ebf17e008ed8682b79f42b0ed9888ecc52ffd1b99bf6b20e5b986f4e6e9bf11bd74a61626c7c044a5fd5284e17bd3d7a44b49e06fe48d3d5ba591b3df201c3a14015b42bf1e90da966f3d8c404452daa8c8080b6d8b120ebcdd26a9105f06fc872bfa31131511a9ae523be6ade510d05824d11bd22b93a9ad7f1bab1503c2b621d4f20715edb628c24826a8d9a3d5ccce46a0c43cf772a24af5fd61b1933d3cad9294ec029e06be0a0f3c60876b253022fb4b0a2880b1e663c18d3052a13cac4dc7e08fa45248186c694faea623729104d0f8bed13372755885dcc83be803ea5d7dd30d6e007eccfae7540ea81ba8cbe9aa5cabc3f2153fba443a286b05db7295fce05007fae1b2dac4d54eca83c7fbf1ec361405ab695e0f619e39268015c4af4c09abcee202ad67ca99551813e2fc0a52fed1c5e6573d1f775afac7c5dd14b6d84c00000002009bd6b7896f760b4cb1bf11ac1d79c49c78569f7c4522e7c413d7a4572212b83dcba775f2f081a7f0a9833e2001d62e0f1f69d3fcca11953f13ca5b89b9e6d2db380c8ece14937d4265adc99c9d864e03c8d5753c12a34c1e4aa709169e174210c50c92326220eae3f1ca85492d0e106a6df5e02cdd5346dfa8832573a7d195a02b381eed1689a156025daade5d34ad074d47976dc7a3e89343b3b31d168a1635f41e75ead573e77a43530729f40d1bc80658ca862c27ee90275583b39815b0"

    return (
        <Button variant="outline" onClick={async () => {
            const payload = {
                "event": {
                    "public_data": publicData,
                    "proof": proof,
                    "vk": vk
                }
            }

            const res = await fetch("https://3q6tzgjhlg.execute-api.us-east-1.amazonaws.com/v1/events", {
                method: "POST", body: JSON.stringify(
                    payload
                )
            })
            console.log(res)
            if (res.ok) {
                const body = await res.json()
                toast({
                    title: body.message,
                })
            }
        }} className="border-yellow-500 hover:bg-yellow-500">
            <LightningBoltIcon className="h-4 w-4 " /> Verify
        </Button>
    )
}

export default VerifyButton