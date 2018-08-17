#!/usr/bin/env python3
import pygatt
import logging as log

SENSORTAG_MAC = "CC:78:AB:7F:5F:83"  # this is Ben's sensortag

adapter = pygatt.GATTToolBackend()


def handle_gyro(handle, value):
    print("---")
    print("> Received handle: %s" % handle)
    print("> Received data: %s" % value)
    print("---")


def main():
    log.basicConfig()
    log.error("Hello!")
    try:
        log.info("Starting adapter...")
        adapter.start()
        log.info("Adapter started. Connecting to " + SENSORTAG_MAC)
        device = adapter.connect(SENSORTAG_MAC)
        log.info("Bluetooth connected. Subscribing...")
        device.subscribe(uuid="0xAA51", callback=handle_gyro)
    finally:
        log.info("Closing adapter...")
        adapter.stop()


if __name__ == "__main__":
    main()
