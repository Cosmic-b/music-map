package main

import (
	"log"
	"net"
	"net/http"
)

func main() {
	mux := http.NewServeMux()
	mux.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir("assets"))))
	mux.Handle("/jsons/", http.StripPrefix("/jsons/", http.FileServer(http.Dir("jsons"))))
	mux.Handle("/", http.FileServer(http.Dir("web")))
	hosts := []string{"127.0.0.1", "::1"}
	addresses, err := net.InterfaceAddrs()
	if err != nil {
		log.Fatal(err)
	}
	seen := make(map[string]bool)
	for _, address := range addresses {
		ip, _, err := net.ParseCIDR(address.String())
		if err != nil {
			continue
		}
		v4 := ip.To4()
		// Detect the local Tailscale/CGNAT address (100.64.0.0/10).
		if v4 != nil && v4[0] == 100 && v4[1] >= 64 && v4[1] <= 127 && !seen[ip.String()] {
			hosts = append(hosts, ip.String())
			seen[ip.String()] = true
		}
	}
	if len(hosts) == 2 {
		log.Println("No local 100.64.0.0/10 address found; serving localhost only")
	}
	for _, host := range hosts {
		address := net.JoinHostPort(host, "8080")
		listener, err := net.Listen("tcp", address)
		if err != nil {
			log.Fatalf("Listen on %s: %v", address, err)
		}
		log.Printf("Canvas prototype: http://%s", address)
		go func() {
			log.Fatal(http.Serve(listener, mux))
		}()
	}
	select {}
}
